document.addEventListener("DOMContentLoaded", () => {
    const rows = document.querySelectorAll('#tasksTable tbody tr.data-row');
    const tabs = document.querySelectorAll('#tabs li');
    const exportButton = document.getElementById('export-excel');

    let activeTab = 'all';

    exportButton.disabled = true;

    exportButton.addEventListener('click', (event) => {
        event.preventDefault();
        fetch('/export_excel', {
            method: 'GET',
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('خطا در دریافت فایل خروجی اکسل');
                }
                return response.blob();
            })
            .then(blob => {
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = 'exported_tasks.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch(error => {
                console.error('Error fetching the Excel file:', error);
                showToast('خطا در دریافت فایل خروجی اکسل', 'error');
            });
    });

    const clearButton = document.getElementById('clear-btn');

    clearButton.addEventListener('click', (event) => {
        event.preventDefault();

        fetch('/reset', {
            method: 'POST',
        })
            .then(response => {
                showToast('تمام تسک ها پاک شدند', 'info');
                document.querySelectorAll('.single-item').forEach(form => {
                    form.reset();
                });

                rows.forEach(row => {
                    row.remove();
                });

                setTimeout(() => {
                    window.location.reload();
                }, 500);
            })
            .catch(error => {
                console.error('Error clearing tasks:', error);
                showToast('خطا در پاک کردن تسک‌ها', 'error');
            });
    });

    const updateTabCounts = (allCount, successCount, errorCount) => {
        document.querySelector('[data-tab="all"]').innerHTML = `همه تسک‌ها (${allCount})`;
        document.querySelector('[data-tab="success"]').innerHTML = `موفقیت آمیز (${successCount})`;
        document.querySelector('[data-tab="error"]').innerHTML = `خطا (${errorCount})`;
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active-tab'));
            this.classList.add('active-tab');
            activeTab = this.getAttribute('data-tab');
            filterRows(activeTab);
        });
    });





    const filterRows = status => {
        let countAll = 0, countSuccess = 0, countError = 0;

        rows.forEach(row => {
            const statusCell = row.querySelectorAll('td')[9];
            const rowStatus = statusCell.textContent.trim();

            if (rowStatus === 'موفقیت آمیز') countSuccess++;
            if (rowStatus === 'خطا') countError++;
            countAll++;

            if (status === 'all' ||
                (status === 'success' && rowStatus === 'موفقیت آمیز') ||
                (status === 'error' && rowStatus === 'خطا')) {
                fadeIn(row);
            } else {
                fadeOut(row);
            }

            updateTabCounts(countAll, countSuccess, countError);
        });
    };



    const onClickSubmit = () => {
        document.querySelectorAll('.single-item').forEach(form => {
            form.addEventListener('submit', event => {
                event.preventDefault();
                handleDailyFormSubmission(form);
            });
        });
    };

    const onClickAutoSubmit = () => {
        const autoButton = document.querySelector('#auto-btn');
        if (autoButton) {
            autoButton.addEventListener('click', () => {
                const draftForms = Array.from(document.querySelectorAll('.single-item'))
                    .filter(form => {
                        const row = form.closest('tr');
                        const statusCell = row.querySelectorAll('td')[9];
                        return statusCell && (statusCell.textContent.trim() === "پیش نویس" || statusCell.textContent.trim() === "خطا");
                    });

                if (draftForms.length > 0) {
                    submitFormsSequentially(draftForms, 5, 0);
                } else {
                    showToast("هیچ تسک پیش‌نویسی برای ارسال وجود ندارد", 'info');
                }
            });
        }
    };
    const onClickAutoSubmitDaily = () => {
        const autoButton = document.querySelector('#auto-btn-daily');
        if (autoButton) {
            autoButton.addEventListener('click', () => {
                const draftForms = Array.from(document.querySelectorAll('.single-item'));

                if (draftForms.length > 0) {
                    submitFormsSequentiallyDaily(draftForms, 5, 0);
                } else {
                    showToast("هیچ تسک پیش‌نویسی برای ارسال وجود ندارد", 'info');
                }
            });
        }
    };



    const submitFormsSequentially = async (forms, chunkSize, index) => {
        if (index >= forms.length) {
            showToast("تمام تسک‌ها با موفقیت ارسال شدند", 'success');
            exportButton.disabled = false;
            return;
        }

        const chunk = forms.slice(index, index + chunkSize);

        try {
            await Promise.all(chunk.map(form => handleFormSubmission(form)));
            submitFormsSequentially(forms, chunkSize, index + chunkSize);
        } catch (error) {
            console.error('Error submitting forms:', error);
            showToast('خطایی در ارسال تسک‌ها رخ داد، لطفا دوباره امتحان کنید', 'error');
        }
    };


    const submitFormsSequentiallyDaily = async (forms, chunkSize, index) => {
        if (index >= forms.length) {
            showToast("تمام تسک‌ها با موفقیت ارسال شدند", 'success');
            exportButton.disabled = false;
            return;
        }

        const chunk = forms.slice(index, index + chunkSize);

        try {
            await Promise.all(chunk.map(form => handleDailyFormSubmission(form)));
            submitFormsSequentiallyDaily(forms, chunkSize, index + chunkSize);
        } catch (error) {
            console.error('Error submitting forms:', error);
            showToast('خطایی در ارسال تسک‌ها رخ داد، لطفا دوباره امتحان کنید', 'error');
        }
    };

    const handleDailyFormSubmission = async form => {
        return new Promise(async (resolve, reject) => {
            const username = form.getAttribute('data-username');
            const row = document.getElementById(`row-${username}`);
            const progressBar = row.nextElementSibling.querySelector('.progress-bar');

            startRowProgress(progressBar);

            try {
                for (let i = 1; i <= 14; i++) {                    
                    const requestData = {
                        index: i
                    };

                    // ارسال درخواست با تاریخ مورد نظر در قالب JSON
                    const response = await fetch(`/send_bond/${username}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });

                    const data = await response.json();

                    if (data.error) {
                        showToast(data.error, 'error');
                    } else {
                        showToast(data.message, 'success');
                    }

                    fetchTasksStatus();
                }

                completeRowProgress(progressBar); // تکمیل پیشرفت ردیف
                resolve();

            } catch (error) {
                console.error('Error:', error);
                showToast('خطایی در ارتباط با سرور رخ داد', 'error');
                completeRowProgress(progressBar);
                reject();
            }

            // به‌روزرسانی فیلترها برای نمایش تغییرات پس از اتمام
            filterRows(activeTab);
        });
    };





    const handleFormSubmission = form => {
        return new Promise((resolve, reject) => {
            const formData = new FormData(form);
            const username = form.getAttribute('data-username');
            const row = document.getElementById(`row-${username}`);
            const progressBar = row.nextElementSibling.querySelector('.progress-bar');

            startRowProgress(progressBar);

            fetch(`/send_barbarg/${username}`, {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showToast(data.error, 'error');
                        updateRowStatus(row, 1);
                        resolve();
                    } else {
                        showToast(data.message, 'success');
                        updateRowStatus(row, 2);
                        resolve();
                    }
                    completeRowProgress(progressBar);
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('خطایی در ارتباط با سرور رخ داد', 'error');
                    completeRowProgress(progressBar);
                    resolve();
                });
            filterRows(activeTab);
        });
    };

    const updateRowStatus = (row, status) => {
        const statusCell = row.querySelectorAll('td')[9];
        statusCell.innerHTML = '';

        if (status === 2) {
            statusCell.innerHTML = '<span class="px-2 py-1 rounded-full text-sm font-semibold bg-green-200 text-green-800">موفقیت آمیز</span>';
        } else if (status === 1) {
            statusCell.innerHTML = '<span class="px-2 py-1 rounded-full text-sm font-semibold bg-red-200 text-red-800">خطا</span>';
        } else {
            statusCell.innerHTML = '<span class="px-2 py-1 rounded-full text-sm font-semibold bg-yellow-200 text-yellow-800">پیش نویس</span>';
        }
    };

    const fadeIn = element => {
        element.style.opacity = 0;
        element.style.display = '';
        let opacity = 0;
        const timer = setInterval(() => {
            if (opacity >= 1) clearInterval(timer);
            element.style.opacity = opacity;
            opacity += 0.1;
        }, 1);
    };

    const fadeOut = element => {
        let opacity = 1;
        const timer = setInterval(() => {
            if (opacity <= 0) {
                clearInterval(timer);
                element.style.display = 'none';
            }
            element.style.opacity = opacity;
            opacity -= 0.1;
        }, 1);
    };

    const startRowProgress = progressBar => {
        progressBar.style.transition = 'width 30s linear';
        progressBar.style.width = '100%';
    };

    const completeRowProgress = progressBar => {
        setTimeout(() => {
            progressBar.style.transition = '';
            progressBar.style.width = '0%';
        }, 1000);
    };

    const showTaskDetails = text => {
        const modalOverlay = document.createElement('div');
        modalOverlay.classList.add('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'flex', 'justify-center', 'items-center', 'z-50');

        const modalContent = `
            <div class="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                <h2 class="text-xl font-bold mb-4 text-center">توضیحات تسک</h2>
                <p class="mb-4">${text}</p>
                <div class="text-center">
                    <button id="closeModal" class="bg-blue-500 text-white px-4 py-2 rounded-md z-51">بستن</button>
                </div>
            </div>
        `;

        modalOverlay.innerHTML = modalContent;
        document.body.appendChild(modalOverlay);

        modalOverlay.addEventListener('click', () => {
            modalOverlay.remove();
        });

        modalOverlay.addEventListener('click', e => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    };

    function showToast(message, type = 'info') {
        if (type === 'success') {
            toastr.success(message, {
                "closeButton": true,
                "progressBar": true,
                "positionClass": "toast-top-right",
                "timeOut": "3000"
            });
        } else if (type === 'error') {
            toastr.error(message, {
                "closeButton": true,
                "progressBar": true,
                "positionClass": "toast-top-right",
                "timeOut": "5000"
            });
        } else {
            toastr.info(message, 'Info', {
                "closeButton": true,
                "progressBar": true,
                "positionClass": "toast-top-right",
                "timeOut": "3000"
            });
        }
    }

    document.querySelectorAll('.info-icon').forEach(icon => {
        icon.addEventListener('click', function () {
            const taskText = this.getAttribute('data-text');
            showTaskDetails(taskText);
        });
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        modalOverlay.remove();
    });

    function onClickModal() {
        const modal = document.getElementById('editTaskModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const closeModalButton = document.getElementById('closeModal');

        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function () {
                const username = this.getAttribute('data-username');
                fetch(`/get_task/${username}`)
                    .then(response => response.json())
                    .then(data => {
                        // Populate the form with the data
                        document.getElementById('username').value = data.username;
                        document.getElementById('sender_lat').value = data.origin_lat;
                        document.getElementById('sender_lon').value = data.origin_lon;
                        document.getElementById('sender_name').value = data.sender_name;
                        document.getElementById('sender_mobile').value = data.sender_mobile;
                        document.getElementById('receiver_lat').value = data.destination_lat;
                        document.getElementById('receiver_lon').value = data.destination_lon;
                        document.getElementById('receiver_name').value = data.receiver_name;
                        document.getElementById('receiver_mobile').value = data.receiver_mobile;
                        document.getElementById('driver_national_id').value = data.driver_national_id;
                        document.getElementById('key').value = data.key;


                        document.getElementById('plate-number').textContent = toPersianDigits(data.plate_two_digit);
                        document.getElementById('plate-letter').textContent = toPersianDigits(data.plate_three_digit) + toPersianDigits(data.plate_letter);
                        document.getElementById('plate-iranNo-strong').textContent = toPersianDigits(data.iran_code);



                        // Show modal
                        modal.classList.add('active');
                        modalOverlay.classList.add('active');
                        modal.classList.remove('hidden');
                        modalOverlay.classList.remove('hidden');
                    });
            });
        });

        closeModalButton.addEventListener('click', function () {
            closeModal();
        });

        document.getElementById('editTaskForm').addEventListener('submit', function (event) {
            event.preventDefault();

            const taskData = {
                key: document.getElementById('key').value,
                username: document.getElementById('username').value,
                sender_name: document.getElementById('sender_name').value,
                sender_lat: document.getElementById('sender_lat').value,
                sender_lon: document.getElementById('sender_lon').value,
                sender_mobile: document.getElementById('sender_mobile').value,
                receiver_name: document.getElementById('receiver_name').value,
                receiver_mobile: document.getElementById('receiver_mobile').value,
                receiver_lat: document.getElementById('receiver_lat').value,
                receiver_lon: document.getElementById('receiver_lon').value,
                driver_national_id: document.getElementById('driver_national_id').value,
            };

            fetch('/update_task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            })
                .then(response => response.json())
                .then(data => {
                    console.log(data.message);
                    closeModal();
                    location.reload();
                });
        });

        function closeModal() {
            modal.classList.remove('active');
            modalOverlay.classList.remove('active');
            setTimeout(() => {
                modal.classList.add('hidden');
                modalOverlay.classList.add('hidden');
            }, 300);
        }
    }

    function enableEditableCells() {
        document.querySelectorAll('.editable').forEach(cell => {
            cell.addEventListener('dblclick', function () {
                makeCellEditable(this);
            });
        });
    }

    function makeCellEditable(cell) {
        const oldValue = cell.textContent.trim();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = oldValue;
        input.classList.add('w-full', 'p-2', 'border', 'rounded');  // Tailwind styles

        cell.textContent = '';
        cell.appendChild(input);
        input.focus();

        input.addEventListener('blur', function () {
            saveNewValue(cell, oldValue, input.value);
        });

        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                input.blur();
            }
        });
    }

    function toPersianDigits(num) {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, (digit) => persianDigits[digit]);
    }



    function updateRowData(row, updatedTask) {
        // Update each cell with the new data
        row.querySelector('[data-name="username"]').textContent = updatedTask.username;
        row.querySelector('[data-name="driver_national_id"]').textContent = updatedTask.driver_national_id;
        row.querySelector('[data-name="pelak"]').textContent = updatedTask.pelak;
        row.querySelector('[data-name="required_amount"]').textContent = updatedTask.required_amount;
        row.querySelector('[data-name="sender_name"]').textContent = updatedTask.sender_name;
        row.querySelector('[data-name="sender_mobile"]').textContent = updatedTask.sender_mobile;
        row.querySelector('[data-name="receiver_name"]').textContent = updatedTask.receiver_name;
        row.querySelector('[data-name="receiver_mobile"]').textContent = updatedTask.receiver_mobile;
        row.querySelector('[data-name="weight"]').textContent = updatedTask.weight;
        row.querySelector('[data-name="product_name"]').textContent = updatedTask.product_name;
        row.querySelector('[data-name="packaging_type"]').textContent = updatedTask.packaging_type;
        row.querySelector('[data-name="shipping_cost"]').textContent = updatedTask.shipping_cost;


        const statusCell = row.querySelector('[data-name="status"]');
        statusCell.innerHTML = '';

        if (updatedTask.status == 0) {
            statusCell.innerHTML = '<span class="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-200 text-yellow-800">پیش نویس</span>';
        } else if (updatedTask.status == 1) {
            statusCell.innerHTML = '<span class="px-3 py-1 rounded-full text-sm font-semibold bg-red-200 text-red-800">حالت خطا</span>';
        } else if (updatedTask.status == 2) {
            statusCell.innerHTML = '<span class="px-3 py-1 rounded-full text-sm font-semibold bg-green-200 text-green-800">موفقیت آمیز</span>';
        }
    }

    function saveNewValue(cell, oldValue, newValue) {
        if (oldValue === newValue.trim()) {
            cell.textContent = oldValue;
            return;
        }

        const row = cell.closest('tr');
        const username = row.querySelector('form').getAttribute('data-username');
        const columnName = getColumnName(cell);

        taskData = {
            key: username
        };

        taskData[columnName] = newValue;

        fetch(`/update_task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    cell.textContent = newValue;
                    showToast(data.message, 'success');
                } else {
                    cell.textContent = oldValue;
                    showToast(data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                cell.textContent = oldValue;
                showToast('Error updating value', 'error');
            });
    }

    function getColumnName(cell) {
        const table = cell.closest('table');
        const headers = table.querySelectorAll('thead th');
        const index = Array.from(cell.parentNode.children).indexOf(cell);
        return headers[index].getAttribute('data-name');
    }

   
    const updateActivityCells = (task, username) => {
        for (let i = 1; i <= 14; i++) {
            const dayKey = `r${i}`;
            const cell = document.querySelector(`#activityGrid-${username} .activity-cell[data-day="${dayKey}"]`);

            if (cell) {
                if (task[dayKey]) {
                    cell.classList.add("registered");  
                    cell.classList.remove("not-registered");
                } else {
                    cell.classList.add("not-registered");  
                    cell.classList.remove("registered");
                }
            }
        }
    };

    
    const updateAllActivityCells = tasks => {
        for (const [username, task] of Object.entries(tasks)) {
            updateActivityCells(task, username);
        }
    };


    function fetchTasksStatus() {
        const dailyTaskModal = document.getElementById("dailyTaskModal");
        const taskContent = document.getElementById("taskContent");
        const nextTaskBtn = document.getElementById("nextTaskBtn");
        const closeTaskModal = document.getElementById("closeTaskModal");
    
        let currentTaskIndex = 0;
        let dailyTasks = [];
    
        // Function to show modal
        const showModal = () => {
            dailyTaskModal.classList.remove("hidden");
        };
    
        // Function to hide modal
        const hideModal = () => {
            dailyTaskModal.classList.add("hidden");
        };
    
        // Function to load tasks
        const loadDailyTasks = async () => {
            try {
                const response = await fetch("/get_tasks_status");
                dailyTasks = await response.json();
                currentTaskIndex = 0;
                if (dailyTasks && Object.keys(dailyTasks).length > 0) {
                    showNextTask();
                    showModal();
                } else {
                    console.log("No daily tasks found.");
                }
            } catch (error) {
                console.error("Error fetching tasks:", error);
            }
        };
    
        // Function to show the next task
        const showNextTask = () => {
            if (currentTaskIndex < Object.keys(dailyTasks).length) {
                const taskUsername = Object.keys(dailyTasks)[currentTaskIndex];
                taskContent.textContent = `باربرگ روزانه برای کاربر ${taskUsername}`;
                currentTaskIndex++;
            } else {
                hideModal();
            }
        };
    
        // Event listener for next task button
        nextTaskBtn.addEventListener("click", showNextTask);
    
        // Event listener for close modal button
        closeTaskModal.addEventListener("click", hideModal);
    
        // Trigger the load of daily tasks on click of the daily tasks button
        document.getElementById("auto-btn-daily").addEventListener("click", loadDailyTasks);
        
    }

    function onShowMonyFormat(){
        const currencyCells = document.querySelectorAll("td[data-name='money']");

        currencyCells.forEach(cell => {
            let value = parseFloat(cell.innerText);
            if (!isNaN(value)) {
                cell.innerText = new Intl.NumberFormat('fa-IR', {
                    style: 'currency',
                    currency: 'IRR',
                }).format(value);
            }
        });
    }

    onClickAutoSubmit();
    onClickAutoSubmitDaily();
    onClickSubmit();
    filterRows(activeTab);
    onClickModal();
    enableEditableCells();
    fetchTasksStatus();
    onShowMonyFormat();

});
