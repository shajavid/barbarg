document.addEventListener("DOMContentLoaded", () => {
    const tasksTableBody = document.querySelector("#tasksTable tbody");
    const activeControllers = [];
    let startTasks = false;
    const dateInput = document.getElementById("selected-date");
    dateInput.value = new Date().toISOString().split("T")[0];

    const fetchTasks = async () => {
        try {
            const response = await fetch('/get_tasks');
            const data = await response.json();
            const tasks = data.tasks;
            updateTasksTable(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const formatCurrencyCells = () => {
        document.querySelectorAll("td[data-name='money']").forEach(cell => {
            const value = parseFloat(cell.innerText);
            if (!isNaN(value)) {
                cell.innerText = new Intl.NumberFormat('fa-IR', { style: 'currency', currency: 'IRR' }).format(value);
            }
        });
    };

    // Update the tasks table based on fetched data
    const updateTasksTable = (tasks) => {
        tasksTableBody.innerHTML = "";
        Object.entries(tasks).forEach(([user_name, task],index) => {
            const row = createTaskRow(user_name, task,index);
            tasksTableBody.appendChild(row);
            tasksTableBody.appendChild(createProgressRow());
        });
        formatCurrencyCells();
    };

    // Create a task row
    const createTaskRow = (user_name, task,index) => {
        const row = document.createElement("tr");
        row.classList.add("data-row", "border-b", "border-gray-200", "hover:bg-gray-100");
        row.id = `row-${user_name}`;
        row.dataset.id = user_name;
        row.dataset.lastRegistered = task.last_registered || '';

        row.innerHTML = `
            <form data-username="${task.key}" method="POST" class="single-item inline-block mr-2 hidden"></form>
            <td class="py-3 px-2 editable">${index + 1}</td>
            <td class="py-3 px-2 editable">${task.username}</td>
            <td class="py-3 px-2 editable">${task.driver_national_id}</td>
            <td class="py-3 px-2 editable">${task.pelak}</td>
            <td class="py-3 px-2 editable">${task.sender_name}</td>
            <td class="py-3 px-2 editable">${task.sender_mobile}</td>
            <td class="py-3 px-2 editable">${task.receiver_name}</td>
            <td class="py-3 px-2 editable">${task.receiver_mobile}</td>
            <td class="py-3 px-2 editable" data-name="money">${task.value}</td>
            <td class="px-2 py-2 status-cell">نامشخص</td>
        `;
        return row;
    };

    // Create a progress row
    const createProgressRow = () => {
        const progressRow = document.createElement("tr");
        progressRow.classList.add("progress-row", "border-hidden");
        progressRow.innerHTML = `<td colspan="20"><div class="progress-bar bg-blue-500 h-2" style="width: 0%;"></div></td>`;
        return progressRow;
    };

    const autoSubmitTasks = () => {
        document.querySelector('#auto-btn')?.addEventListener('click', () => {
            startTasks = true;
            const draftForms = [...document.querySelectorAll('.single-item')].filter(form => form.closest('tr').dataset.registered != 1);
            if (draftForms.length > 0) {
                submitFormsSequentially(draftForms, 1);
            } else {
                showToast("هیچ تسک پیش‌ نویسی برای ارسال وجود ندارد", 'info');
            }
        });
    };

    const submitFormsSequentially = async (forms, chunkSize, index = 0) => {
        if (index >= forms.length) return showToast("تمام تسک‌ها با موفقیت ارسال شدند", 'success');
        
        const chunk = forms.slice(index, index + chunkSize);
        try {
            await Promise.all(chunk.map(form => handleFormSubmission(form)));
            submitFormsSequentially(forms, chunkSize, index + chunkSize);
        } catch (error) {
            console.error('Error submitting forms:', error);
            showToast('خطایی در ارسال تسک‌ها رخ داد، لطفا دوباره امتحان کنید', 'error');
        }
    };

    window.setDate = function (daysOffset) {
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        dateInput.value = date.toISOString().split("T")[0];
        dateInput.dispatchEvent(new Event('change'));
 
        updateButtonStyles(daysOffset);
    };

    stopTasks = function () {
        const stopButton = document.querySelector('#stop-btn');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                activeControllers.forEach(controller => controller.abort());
                activeControllers.length = 0;
                startTasks = false;
                showToast("تمام درخواست‌ها متوقف شدند", 'info');
            });
        }
    };

    const handleFormSubmission = async (form) => {
        if (!startTasks) return;
        const controller = new AbortController();
        activeControllers.push(controller);
    
        const username = form.dataset.username;
        const selectedDate = dateInput.value;
        const requestData = { date: selectedDate };
    
        const row = document.getElementById(`row-${username}`);
        const progressBar = row.nextElementSibling.querySelector('.progress-bar');
        startRowProgress(progressBar);
    
        try {
            const response = await fetch(`/send_bond/${username}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
                signal: controller.signal,
            });
            const data = await response.json();
    
            if (data.error) {
                showToast(data.error, 'error');
                row.classList.add('bg-red-200');
                updateStatusIcon(row, 'error', data.error);
            } else {
                showToast(data.message, 'success');
                row.classList.add('bg-green-200'); 
                updateStatusIcon(row, 'info', data.message);
            }
            row.dataset.lastRegistered = new Date().toISOString();
    
            // حذف نیاز به رفرش لیست کامل
            updateRowStatus(row, data);
    
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`Request for ${username} was aborted.`);
            } else {
                console.error('Error:', error);
                showToast('خطایی در ارتباط با سرور رخ داد', 'error');
                row.classList.add('bg-red-200');
                updateStatusIcon(row, 'error', 'خطایی در ارتباط با سرور رخ داد');
            }
        } finally {
            completeRowProgress(progressBar);
        }
    };

    const updateStatusIcon = (row, type, message) => {
        const statusCell = row.querySelector('.status-cell');
        statusCell.innerHTML = ''; // حذف محتوای قبلی
    
        const icon = document.createElement('span');
        icon.classList.add('status-icon');
    
        // افزودن آیکون بر اساس نوع وضعیت با استفاده از Font Awesome
        if (type === 'error') {
            icon.classList.add('fas', 'fa-times-circle', 'text-red-500'); // آیکون خطا
            icon.setAttribute('title', message);
        } else if (type === 'info') {
            icon.classList.add('fas', 'fa-info-circle', 'text-blue-500'); // آیکون اطلاعات
            icon.setAttribute('title', message);
        }
    
        // اضافه کردن آیکون به سلول وضعیت
        statusCell.appendChild(icon);
    
        // نمایش Tooltip هنگام هاور
        icon.addEventListener('mouseover', () => {
            showTooltip(icon, message);
        });
        icon.addEventListener('mouseout', hideTooltip);
    };
    
    
    // نمایش Tooltip
    const showTooltip = (element, message) => {
        const tooltip = document.createElement('div');
        tooltip.classList.add('tooltip');
        tooltip.innerText = message;
        document.body.appendChild(tooltip);
    
        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.top - tooltip.offsetHeight}px`;
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
    };
    
    // پنهان‌سازی Tooltip
    const hideTooltip = () => {
        document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());
    };

    const updateRowStatus = (row, data) => {
        const statusCell = row.querySelector('.status-cell');
        if (data.error) {
            // اگر خطا وجود دارد
            row.classList.add('bg-red-200'); // رنگ سطر قرمز برای خطا
            row.classList.remove('bg-green-200');
            statusCell.innerText = 'خطا در ثبت';
            updateStatusIcon(row, 'error', data.error); // افزودن آیکون خطا
        } else {
            // در صورت موفقیت
            row.classList.add('bg-green-200'); // رنگ سطر سبز برای موفقیت
            row.classList.remove('bg-red-200');
            statusCell.innerText = 'ثبت شده';
            updateStatusIcon(row, 'info', data.message); // افزودن آیکون اطلاعات
        }
    };
    

    function updateButtonStyles(selectedOffset) {
        // به همه دکمه‌ها دسترسی پیدا می‌کنیم
        const buttons = document.querySelectorAll(".date-button");

        buttons.forEach((button, index) => {
            // متنی که درون دکمه است را به عدد تبدیل می‌کنیم تا با offset مقایسه کنیم
            const offset = parseInt(button.getAttribute("onclick").match(/-?\d+/)[0]);

            // استایل فعال یا غیرفعال را تنظیم می‌کنیم
            if (offset === selectedOffset) {
                button.classList.add("bg-blue-500", "text-white", "font-bold");
                button.classList.remove("bg-gray-200", "bg-gray-300");
            } else {
                button.classList.remove("bg-blue-500", "text-white", "font-bold");
                button.classList.add("bg-gray-200");
            }
        });
    }

    // Start and complete progress bar
    const startRowProgress = (progressBar) => {
        progressBar.style.transition = 'width 10s linear';
        progressBar.style.width = '100%';
    };

    const completeRowProgress = (progressBar) => {
        setTimeout(() => {
            progressBar.style.transition = '';
            progressBar.style.width = '0%';
        }, 1000);
    };

    // Show notifications
    const showToast = (message, type = 'info') => {
        const options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: type === 'error' ? "5000" : "3000"
        };
        toastr[type](message, '', options);
    };

    // Refresh the list and update the task statuses
    const refreshList = () => {
        const selectedDate = dateInput.value;
        $.ajax({
            url: '/check_all_daily_bonds',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ date: selectedDate }),
            success: (response) => updateTable(response.statuses),
            error: () => showToast("خطایی رخ داد. لطفاً دوباره تلاش کنید.", 'error')
        });
    };

    // Update the table based on statuses
    const updateTable = (statuses) => {
        $('#tasksTable tbody tr').each(function () {
            const username = $(this).data('id');
            const status = statuses[username];
            $(this).toggleClass('bg-green-200', !!status)
                .attr('data-registered', status ? '1' : '0')
                .find('.status-cell').text(status ? 'ثبت شده' : 'ثبت نشده');
        });
    };

    // Initialize listeners and data fetching
    const init = () => {
        autoSubmitTasks();
        dateInput.addEventListener('change', refreshList);
        document.querySelector('#stop-btn')?.addEventListener('click', stopTasks);
        fetchTasks().then(() => dateInput.dispatchEvent(new Event('change')));
    };

    init();
});