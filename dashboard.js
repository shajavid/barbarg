document.addEventListener("DOMContentLoaded", async () => {

    const rows = document.querySelectorAll('#tasksTable tbody tr.data-row');
    const tabs = document.querySelectorAll('#tabs li');
    var startTasks = false;
    var hidden = false;
    const tasksTableBody = document.querySelector("#tasksTable tbody");
    const activeControllers = [];

    var config = await getConfig();

    let activeTab = 'all';

    const clearButton = document.getElementById('clear-btn');
    const selectAllBtn = document.getElementById('select-all-btn'); 
    const unSelectAllBtn = document.getElementById('unselect-all-btn');

    let currentPage = 1;
    let loading = true;
    let index = 1;
    const pageSize = config.PAGE_SIZE || 500;

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

    selectAllBtn.addEventListener('click',(event)=>{
        event.preventDefault();
        fetch('/select_all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                selected: true,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    console.log('Task updated successfully:', data);
                    fetchTasks();
                } else {
                    console.error('Error updating task:', data.error);
                }
            })
            .catch((error) => {
                console.error('Request failed:', error);
            });
    });

    unSelectAllBtn.addEventListener('click',(event)=>{
        event.preventDefault();
        fetch('/select_all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                selected: false,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    console.log('Task updated successfully:', data);
                    fetchTasks();
                } else {
                    console.error('Error updating task:', data.error);
                }
            })
            .catch((error) => {
                console.error('Request failed:', error);
            });
    });

    function onGetWalletBalances() {
        startTasks = true;
        const walletButton = document.querySelector('#get-wallet');
        if (walletButton) {
            walletButton.addEventListener('click', (event) => {
                event.preventDefault();
                const draftForms = Array.from(document.querySelectorAll('.single-item'))
                    .filter(form => {
                        const row = form.closest('tr');
                        const registered = row.dataset.registered;

                        return registered != 1;
                    });

                if (draftForms.length > 0) {
                    submitFormsSequentially(draftForms, 500, 0);
                } else {
                    showToast("هیچ تسک پیش‌ نویسی برای ارسال وجود ندارد", 'info');
                }

            });
        }
    }

    function getConfig() {
        return fetch('/get_config')
            .then(response => response.json())
    }

    const submitFormsSequentially = async (forms, chunkSize, index) => {
        if (index >= forms.length) {
            showToast("تمام موجودی ها با موفقیت بروز شدند", 'success');
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

    const handleFormSubmission = form => {
        if (!startTasks) return;
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            activeControllers.push(controller);

            const username = form.getAttribute('data-username');

            const requestData = {};

            const row = document.getElementById(`row-${username}`);
            const progressBar = row.nextElementSibling.querySelector('.progress-bar');

            startRowProgress(progressBar);

            fetch(`/get_wallet/${username}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showToast(data.error, 'error');
                    } else {
                        balance = data.balance;
                        const row = document.getElementById(`row-${username}`);
                        row.querySelector('td[data-name="money"]').innerText = balance;
                        onShowMonyFormat();
                        showToast("موجودی با موفقیت بروزرسانی شد.", 'success');

                    }
                    completeRowProgress(progressBar);
                    resolve();
                })
                .catch(error => {
                    if (error.name === 'AbortError') {
                        console.log(`Request for ${username} was aborted.`);
                    } else {
                        console.error('Error:', error);
                        showToast('خطایی در ارتباط با سرور رخ داد', 'error');
                    }
                    completeRowProgress(progressBar);
                    resolve();
                });
        });
    };

    function stopTasks() {
        const stopButton = document.querySelector('#stop-btn');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                activeControllers.forEach(controller => controller.abort());
                activeControllers.length = 0;
                startTasks = false;
                showToast("تمام درخواست‌ها متوقف شدند", 'info');
            });
        }
    }

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

    function hideData() {
        btn = document.getElementById('hide-btn');

        if (btn) {
            btn.addEventListener('click', (event) => {
                event.preventDefault();


                if (!hidden) {
                    const all = document.querySelectorAll('.secure');

                    all.forEach(element => {
                        element.innerText = '*****';
                    });
                    hidden = true;


                } else {
                    hidden = false;
                    init();
                }



            });
        }
    }

    function init() {
        setCurrencyFormat();
        onClickModal();
        filterRows(activeTab);
        onGetWalletBalances();
        stopTasks();
        loadTask = true;
        fetchTasks(currentPage)
            .then(function () {
                onCharge();
                onClickModal();
            })
        hideData(); 
    }

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

    const filterRows = status => {
        let countAll = 0, countSuccess = 0, countError = 0;

        rows.forEach(row => {
            const statusCell = row.querySelectorAll('td')[8];
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

    const updateTabCounts = (allCount, successCount, errorCount) => {
        document.querySelector('[data-tab="all"]').innerHTML = `همه تسک‌ها (${allCount})`;
        document.querySelector('[data-tab="success"]').innerHTML = `موفقیت آمیز (${successCount})`;
        document.querySelector('[data-tab="error"]').innerHTML = `خطا (${errorCount})`;
    };

    function setCurrencyFormat() {
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


                        document.getElementById('wallet-amount').textContent = new Intl.NumberFormat('fa-IR', {
                            style: 'currency',
                            currency: 'IRR',
                        }).format(data.wallet_balance);

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

    function toPersianDigits(num) {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, (digit) => persianDigits[digit]);
    }

    function onCharge() {
        const chargeButtons = document.querySelectorAll('.charge-btn');

        chargeButtons.forEach(button => {
            button.addEventListener('click', function () {
                const username = button.dataset.username;
                fetch('/update_token/' + username)
                    .then(response => response.json())
                    .then(data => {
                        if (data.redirect_url) {
                            window.location.href = data.redirect_url;
                        } else {
                            console.error("Invalid response from server:", data);
                        }
                    })
                    .catch(error => console.error('Error:', error));
            });
        });
    }

    var loadTask = false;


    const fetchTasks = (page) => {

        return fetch(`/get_tasks?page=${page}&size=${pageSize}`)
            .then(response => response.json())
            .then(data => {
                loading = data.page * data.size < data.total_tasks;
                updateTasksTable(data.tasks)
            })
            .then(() => loadTask = true)
            .catch(error => console.error('Error fetching tasks:', error));


    };


  

    const updateTasksTable = (tasks) => {
        tasksTableBody.innerHTML = ''

        for (const [user_name, task] of Object.entries(tasks)) {

            const row = document.createElement("tr");
            row.classList.add("data-row", "border-b", "border-gray-200", "hover:bg-gray-100");
            row.id = `row-${user_name}`;
            row.dataset.lastRegistered = task.last_registered || '';

            status = task.status == 0 ? 'پیش نویس' : task.status == 1 ? 'خطا' : 'موفقیت آمیز';
            statustd = task.status == 0 ? 'bg-yellow-200' : task.status == 1 ? 'bg-red-200' : 'bg-green-200';


            row.innerHTML = `
                <form data-username="${task.key}" method="POST" class="single-item inline-block mr-2 hidden"></form>
                <td class="px-2 py-2">
                    <label class="custom-checkbox">
                        <input type="checkbox" class="rowCheckbox" ${task.selected ? 'checked' : ''} />
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="py-3 px-2 editable secure">${index++}</td>
                <td class="py-3 px-2 editable secure">${task.username}</td>
                <td class="py-3 px-2 editable secure">${task.password}</td>
                <td class="py-3 px-2 editable secure">${task.driver_national_id}</td>
                <td class="py-3 px-2 editable secure">${task.pelak}</td>
                <td class="py-3 px-2 editable ">${task.sender_name}</td>
                <td class="py-3 px-2 editable secure">${task.sender_mobile}</td>
                <td class="py-3 px-2 editable">${task.receiver_name}</td>
                <td class="py-3 px-2 editable secure">${task.receiver_mobile}</td>
                <td class="py-3 px-2 editable" data-name="money">${task.value}</td>
                <td class="py-3 px-2">
                    <span class="px-2 py-1 text-xs rounded-full ${statustd}">${status}</span>
                </td>
                <td class="px-4 py-2">
                                                <button
                                                    class="text-green-600 px-2 py-1 rounded-md  transition edit-btn"
                                                    data-username="${task.key}">
                                                    <i class="fas fa-pencil" title="ویرایش"></i>
                                                </button>
                                                <button
                                                    class="px-2 text-blue-600 py-1 rounded-md transition charge-btn"
                                                    data-username="${task.key}">
                                                    <i class="fas fa-coins" title="شارژ"></i>
                                                </button>
                                            </td>
            `;

            // اضافه کردن ردیف به بدنه جدول
            tasksTableBody.appendChild(row);

            // اضافه کردن ردیف پیشرفت
            const progressRow = document.createElement("tr");
            progressRow.classList.add("progress-row", "border-hidden");
            progressRow.innerHTML = `
                <td colspan="20">
                    <div class="progress-bar bg-blue-500 h-2" style="width: 0%;"></div>
                </td>
            `;
            tasksTableBody.appendChild(progressRow);
        }
        onShowMonyFormat();

    };

    function onShowMonyFormat() {
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



    init();
});