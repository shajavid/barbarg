document.addEventListener("DOMContentLoaded", () => {
    const tasksTableBody = document.querySelector("#tasksTable tbody");
    const activeControllers = [];
    let startTasks = false;
    let intervalId = null;
    const dateInput = document.getElementById("selected-date");
    dateInput.value = new Date().toISOString().split("T")[0];

    let currentPage = 1; // شماره صفحه فعلی
    let isLoading = false; // وضعیت بارگذاری
    let hasMoreTasks = true; // آیا تسک‌های بیشتری وجود دارد یا خیر

    window.setDate = function (daysOffset) {
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        dateInput.value = date.toISOString().split("T")[0];
        dateInput.dispatchEvent(new Event('change'));
 
        updateButtonStyles(daysOffset);
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

    const hideTooltip = () => {
        document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());
    };
    

    function updateButtonStyles(selectedOffset) {
        const buttons = document.querySelectorAll(".date-button");

        buttons.forEach((button, index) => {
            const offset = parseInt(button.getAttribute("onclick").match(/-?\d+/)[0]);

            if (offset === selectedOffset) {
                button.classList.add("bg-blue-500", "text-white", "font-bold");
                button.classList.remove("bg-gray-200", "bg-gray-300");
            } else {
                button.classList.remove("bg-blue-500", "text-white", "font-bold");
                button.classList.add("bg-gray-200");
            }
        });
    }


    const fetchTasks = async (page = 1) => {
        if (isLoading || !hasMoreTasks) return;
        isLoading = true;
        try {
            const response = await fetch(`/get_tasks?page=${page}`);
            const data = await response.json();

            // تبدیل شیء tasks به آرایه
            var tasks = Object.values(data.tasks || {});

            tasks = getDailyBondStatus(tasks)

            console.log(tasks)

            if (tasks.length === 0) {
                hasMoreTasks = false; // هیچ تسک بیشتری وجود ندارد
            } else {
                updateTasksTable(tasks);
            }

            isLoading = false;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            isLoading = false;
        }
    };


    const updateTasksTable = (tasks) => {
        tasks.forEach((task, index) => {
            const row = createTaskRow(task.username, task, index);
            tasksTableBody.appendChild(row);
            tasksTableBody.appendChild(createProgressRow());
        });
        formatCurrencyCells();
    };

    const formatCurrencyCells = () => {
        document.querySelectorAll("td[data-name='money']").forEach(cell => {
            const value = parseFloat(cell.innerText);
            if (!isNaN(value)) {
                cell.innerText = new Intl.NumberFormat('fa-IR', { style: 'currency', currency: 'IRR' }).format(value);
            }
        });
    };


    const createTaskRow = (user_name, task, index) => {
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

    const createProgressRow = () => {
        const progressRow = document.createElement("tr");
        progressRow.classList.add("progress-row", "border-hidden");
        progressRow.innerHTML = `<td colspan="20"><div class="progress-bar bg-blue-500 h-2" style="width: 0%;"></div></td>`;
        return progressRow;
    };

    const autoSubmitTasks = () => {
        document.querySelector('#auto-btn')?.addEventListener('click', () => {
            startTasks = true;
            if (intervalId) return; 
            intervalId = setInterval(() => submitPendingTasks(), 10000); 
            submitPendingTasks(); 
        });
    };

    const submitPendingTasks = () => {
        const draftForms = [...document.querySelectorAll('.single-item')]
            .filter(form => form.closest('tr').dataset.registered != 1);
        if (draftForms.length > 0) {
            submitFormsSequentially(draftForms, 1);
        } else {
            showToast("هیچ تسک پیش‌ نویسی برای ارسال وجود ندارد", 'info');
        }
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

    const stopTasks = () => {
        const stopButton = document.querySelector('#stop-btn');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                clearInterval(intervalId); // متوقف کردن تایمر
                intervalId = null;
                activeControllers.forEach(controller => controller.abort()); // متوقف کردن درخواست‌ها
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

        let username = form.dataset.username;
        let key = username;

        if (!username.startsWith('0')) {
            key = '0' + username;
        }
        const selectedDate = dateInput.value;
        const requestData = { date: selectedDate };

        const row = document.getElementById(`row-${key}`);

        // پیدا کردن سطر پیشرفت
        const progressRow = row?.nextElementSibling;
        if (!progressRow || !progressRow.classList.contains('progress-row')) {
            console.warn(`Progress row not found for ${key}`);
            return;
        }

        const progressBar = progressRow.querySelector('.progress-bar');
        if (!progressBar) {
            console.warn(`Progress bar not found for ${key}`);
            return;
        }

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
            } else {
                showToast(data.message, 'success');
                row.classList.add('bg-green-200');
            }

            row.dataset.registered = 1;
            row.dataset.lastRegistered = new Date().toISOString();
            updateRowStatus(row, data);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`Request for ${username} was aborted.`);
            } else {
                console.error('Error:', error);
                showToast('خطایی در ارتباط با سرور رخ داد', 'error');
                row.classList.add('bg-red-200');
            }
        } finally {
            completeRowProgress(progressBar);
        }
    };

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




    const infiniteScrollLoadTasks = () => {
        window.addEventListener('scroll', async () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
                if (hasMoreTasks && !isLoading) {
                    currentPage += 1; // برو به صفحه بعدی
                    await fetchTasks(currentPage); // بارگذاری تسک‌های صفحه جدید
                }
            }
        });
    };

    const getDailyBondStatus = (tasks) => {
        const today = new Date();
        const dateFormat = (date) => date.toISOString().split('T')[0]; // تبدیل تاریخ به فرمت YYYY-MM-DD
    
        // ایجاد بازه 7 روز قبل و 7 روز بعد
        const getDateRange = (daysBefore, daysAfter) => {
            const dates = [];
            for (let i = -daysBefore; i <= daysAfter; i++) {
                const date = new Date();
                date.setDate(today.getDate() + i);
                dates.push(dateFormat(date));
            }
            return dates;
        };
    
        const dateRange = getDateRange(7, 7);
    
        // ایجاد وضعیت برای هر تسک
        const tasksWithBondStatus = Object.entries(tasks).map(([key, task]) => {
            const bondStatus = JSON.parse(task.bond_status || "{}"); // پارسر کردن bond_status
            const dailyStatus = {};
    
            // بررسی وضعیت برای هر تاریخ در بازه
            dateRange.forEach((date) => {
                dailyStatus[date] = bondStatus[date] || false; // true اگر ثبت شده باشد، false در غیر این صورت
            });
    
            return {
                ...task,
                dailyStatus, // اضافه کردن وضعیت روزانه به تسک
            };
        });
    
        return tasksWithBondStatus;
    };

    const init = () => {
        autoSubmitTasks();
        stopTasks();
        infiniteScrollLoadTasks();
        fetchTasks(currentPage);
    };

    init();
});
