document.addEventListener("DOMContentLoaded", async () => {
    let startTasks = false;
    const tasksTableBody = document.querySelector("#tasksTable tbody");
    const activeControllers = [];
    let loadTask = false;
    const statusClasses = {
        default: 'bg-blue-100 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300',
        dark: 'bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300',
        red: 'bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300',
        green: 'bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300',
        yellow : 'bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300'
    };
    var config = await getConfig();

    const updateSuccessProgress = (percentage) => {
        const successCircle = document.querySelector("#success-progress-circle .circle");
        const successText = document.querySelector("#success-progress-circle #success-percentage");

        successCircle.style.strokeDasharray = `${percentage}, 100`;
        successText.textContent = `${percentage}%`;
    };

    const onClickCheckbox = () => {
        const checkboxes = document.querySelectorAll('.rowCheckbox');

        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', function () {
                const row = this.closest('tr');
                const taskKey = row.querySelector('form').dataset.username;
                const isChecked = this.checked;

                fetch('/update_task', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        key: taskKey,
                        selected: isChecked,
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.success) {
                            console.log('Task updated successfully:', data);
                        } else {
                            console.error('Error updating task:', data.error);
                        }
                    })
                    .catch((error) => {
                        console.error('Request failed:', error);
                    });
            });
        });
    }

  

    const totalInput = document.getElementById("total-input");
    const successInput = document.getElementById("success-input");
    const errorInput = document.getElementById("error-input");
    const remainInput = document.getElementById("remain-input");
    const inputRow = document.getElementById("input-row");


    let currentPage = 1;
    const pageSize = config.page_size || 5;
    let loading = true;
    let index = 1;

    const request_interval = config.request_interval || 30;
    const delay_interval = config.delay_interval || 2;

    const generateReportBtn = document.getElementById("generateReportBtn");

    if (generateReportBtn) {
        generateReportBtn.addEventListener("click", async () => {
            try {
                showToast("در حال تولید گزارش، لطفاً صبر کنید...", "info");

                const response = await fetch("/generate_report", { method: "POST" });

                if (!response.ok) {
                    const error = await response.json();
                    showToast(`خطا در تولید گزارش: ${error.error}`, "error");
                    return;
                }

                const data = await response.json();

                if (data.download_url) {
                    showToast("گزارش با موفقیت تولید شد. در حال دانلود...", "success");
                    window.open(data.download_url, "_blank");
                } else {
                    showToast("لینک دانلود گزارش در دسترس نیست!", "error");
                }
            } catch (error) {
                console.error("Error generating report:", error);
                showToast("خطا در تولید گزارش. لطفاً دوباره تلاش کنید.", "error");
            }
        });
    }

    const fetchTasks = async (page = 1) => {
        try {
            const response = await fetch(`/get_legs?page=${page}&size=${pageSize}`);
            const data = await response.json();
            updateTasksTable(data);
            onClickCheckbox();
            loadTask = true;
            loading = data.page * data.size < data.total_tasks;
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    // فرمت‌بندی مقادیر پولی
    const formatMoneyCells = () => {
        const currencyCells = document.querySelectorAll("td[data-name='money']");
        currencyCells.forEach(cell => {
            const value = parseFloat(cell.innerText);
            if (!isNaN(value)) {
                cell.innerText = new Intl.NumberFormat('fa-IR', {
                    style: 'currency',
                    currency: 'IRR',
                }).format(value);
            }
        });
    };

    // به‌روزرسانی جدول تسک‌ها
    const updateTasksTable = (data) => {

        legs = data.legs;
        tasksTableBody.innerHTML = '';
        index = 1;
        const legValues = Object.values(legs);

        allRow = data.all_legs;
        successRow = data.success_legs
        failRow = data.error_legs
        reaminRow = data.all_legs - data.success_legs - data.error_legs
        totalInput.innerText = allRow;
        successInput.innerText = successRow;
        errorInput.innerText = failRow;
        remainInput.innerText = reaminRow;
        inputRow.innerText = data.all_tasks;

        const percentage = allRow ==0 ? 0 : Math.round(((allRow - reaminRow) / allRow) * 100);

        updateProgress(percentage);

        const successPercentage = allRow ==0 ? 0 :Math.round((successRow / allRow) * 100);
        updateSuccessProgress(successPercentage);


        for (const [index, leg] of Object.entries(legs)) {
            const [mainRow, statusRow] = createTaskRow(leg);

            tasksTableBody.appendChild(mainRow);

            const progressRow = createProgressRow();
            tasksTableBody.appendChild(progressRow);

            tasksTableBody.appendChild(statusRow);
        }

        formatMoneyCells();
    };

    // ساخت ردیف تسک
    const createTaskRow = (task) => {
        const row = document.createElement("tr");
        const statusRow = document.createElement("tr");

        // کلاس‌ها و تنظیمات ردیف اصلی
        row.classList.add("data-row", "border-b", "border-gray-200", "hover:bg-gray-100");
        row.id = `row-${task.key}`;
        row.dataset.lastRegistered = task.last_registered || '';

        const registrationStatusText = getRegistrationStatusText(task.registration_status);
        const statusClass = getStatusClass(task.registration_status);

        // کلاس‌ها و تنظیمات ردیف استاتوس
        statusRow.classList.add("status-row", "border-b", "border-gray-200", "bg-gray-50");

        // ردیف اصلی
        row.innerHTML = `
            <form data-username="${task.key}" method="POST" class="single-item inline-block mr-2 hidden"></form> 
           
            <td class="py-3 px-2 editable">${task.row_number}</td>
             <td class="py-3 px-2 editable">${task.leg_number}</td>
            <td class="py-3 px-2 editable">${task.pelak}</td>
            <td class="py-3 px-2 editable">${task.username}</td>
            <td class="py-3 px-2 editable">${task.receiver_name}</td>
            <td class="py-3 px-2 editable">${task.receiver_mobile}</td>
            <td class="py-3 px-2 editable">
                <span class="status-icon ${statusClass}">
                    ${registrationStatusText}
                </span>
            </td>
            <td class="py-3 px-2 editable" data-name="tracking_code">${task.tracking_code}</td> 
            <td class="py-3 px-2 editable" data-name="tracking_code">${task.number_of_tries}/${config.retry_count}</td> 
            <td class="py-3 px-2 editable" data-name="number_done">
                ${task.last_registered ? new Date(task.last_registered).toLocaleDateString('fa-IR', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }) : ''}
            </td> 
            <td class="py-3 px-2" data-name="countdown">--:--</td>
        `;

        const lastRegistered = row.dataset.lastRegistered;
        const countdownCell = row.querySelector('[data-name="countdown"]');
        if (lastRegistered) {
            const lastRegisteredDate = new Date(lastRegistered);
            const now = new Date();
            const timeDiff = (now - lastRegisteredDate) / 1000 / 60;
            const remainingMinutes = request_interval - timeDiff;

            if (remainingMinutes > 0) {
                row.classList.add("disabled");
                const minutes = Math.floor(remainingMinutes);
                const seconds = Math.floor((remainingMinutes - minutes) * 60);
                countdownCell.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                row.classList.remove("disabled");
                countdownCell.innerText = " ";
            }
        } else {
            countdownCell.innerText = "--:--";
        }


        // ردیف استاتوس
        statusRow.innerHTML = `
            <td colspan="10" class="text-xs font-medium me-2 px-2.5 py-0.5 text-right">
            <i class="fa fa-info-circle"></i>
                <strong>وضعیت:</strong> 
                <span class="status-text">${task.status}</span>
            </td>
        `;

        // افزودن کلیک رویداد (در صورت نیاز)
        row.addEventListener("click", () => {
            const form = row.querySelector("form");
            const checkbox = row.querySelector(".rowCheckbox");
            if (form && checkbox) {
                if (checkbox.checked) {
                    form.classList.add("hidden");
                    checkbox.checked = false;
                } else {
                    form.classList.remove("hidden");
                    checkbox.checked = true;
                }
            }
        });

        // بازگرداندن دو ردیف
        return [row, statusRow];
    };


    // ساخت ردیف پیشرفت
    const createProgressRow = () => {
        const progressRow = document.createElement("tr");
        progressRow.classList.add("progress-row", "border-hidden");
        progressRow.innerHTML = `
            <td colspan="20">
                <div class="progress-bar bg-blue-500 h-2" style="width: 0%;"></div>
            </td>
        `;
        return progressRow;
    };

    // دریافت متن وضعیت ثبت‌نام
    const getRegistrationStatusText = (status) => {
        switch (status) {
            case config.status_not_registered:
                return 'ثبت نشده';
            case config.status_registered:
                return 'موفق';
            case config.status_try_again:
                return 'تلاش مجدد';
            case config.status_under_progress:
                    return 'در حال ثبت';
            case config.status_error:
                return 'ناموفق';
            default:
                return 'ثبت نشده';
        }
    };

    // دریافت کلاس وضعیت
    const getStatusClass = (status) => {
        switch (status) {
            case config.status_registered:
                return statusClasses.green;
            case config.status_try_again:
                return statusClasses.yellow;
            case config.status_error:
                return statusClasses.red;
            case config.status_under_progress:
                    return statusClasses.dark;
            default:
                return statusClasses.default;
        }
    };

    // مدیریت کلیک روی دکمه ارسال خودکار
    const onClickAutoSubmit = () => {
        startTasks = true;
        const autoButton = document.querySelector('#auto-btn');
        if (autoButton) {
            autoButton.addEventListener('click', () => {
                handleFormSubmission()
            });
        }
    };

     

    // به‌روزرسانی درصد پیشرفت
    const updateProgress = (percentage) => {
        const progressCircle = document.querySelector("#progress-circle .circle");
        const percentageText = document.querySelector("#progress-circle #progress-percentage");

        progressCircle.style.strokeDasharray = `${percentage}, 100`;
        percentageText.textContent = `${percentage}%`;
    };

    // مدیریت ارسال فرم
    const handleFormSubmission = () => {
        if (!startTasks) return Promise.resolve();

        return new Promise(async (resolve) => {
            const controller = new AbortController();
            activeControllers.push(controller);


            try {
                var response = await fetch(`/send_barbarg/`, {
                    method: 'POST',
                    body: {},
                });

                response = await response.json();

                resolve();
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log(`Request for ${username} was aborted.`);
                } else {
                    console.error('Error:', error);
                    showToast('خطایی در ارتباط با سرور رخ داد', 'error');
                }
                resolve();
            }
        });
    };

   
    // نمایش پیام‌های توست
    const showToast = (message, type = 'info') => {
        const options = {
            "closeButton": true,
            "progressBar": true,
            "positionClass": "toast-top-right",
            "timeOut": type === 'error' ? "5000" : "3000"
        };

        if (type === 'success') {
            toastr.success(message, '', options);
        } else if (type === 'error') {
            toastr.error(message, '', options);
        } else {
            toastr.info(message, 'Info', options);
        }
    };

     

    // توقف تسک‌ها
    const stopTasks = () => {
        const stopButton = document.querySelector('#stop-btn');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                startTasks = false;
                activeControllers.forEach(controller => controller.abort());
                activeControllers.length = 0;
                showToast("تمام درخواست‌ها متوقف شدند", 'info');
            });
        }
    };


    function getConfig() {
        return fetch('/get_config')
            .then(response => response.json())
    }


    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY + 10 >= document.body.offsetHeight & loadTask & loading) {
            currentPage++;
            loadTask = false;
            fetchTasks(currentPage);
        }
    });



    // فراخوانی توابع اولیه
    onClickAutoSubmit();
    stopTasks();
    fetchTasks();
    setInterval(function () {
        fetchTasks();
    }, 1000);
 


});
