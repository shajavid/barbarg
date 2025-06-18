document.addEventListener("DOMContentLoaded", function () {
    init();

    function init() {
        onClickModal();
        onDeleteUser(); 
    }

    function onClickModal() {
        const modal = document.getElementById('editUserModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const closeModalButton = document.getElementById('closeModal');

        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function () {
                const username = this.getAttribute('data-username');
                fetch(`/get_user/${username}`)
                    .then(response => response.json())
                    .then(data => {
                        // Populate the form with the user data
                        document.getElementById('fullname').value = data.fullname;
                        document.getElementById('priority').value = data.priority;
                        document.getElementById('username').value = data.username;
                        document.getElementById('password').value = data.password;
                        document.getElementById('active').checked = data.active;

                        // Split the plate number into different components
                        const plateNo = data.plateNo;
                        const iranNo = data.iranNo;

                        // Assuming the plateNo is structured like "519ی36", we extract the numbers and letters
                        const plateNumber = plateNo.substring(0, 3);  // First three digits
                        const plateLetter = plateNo[3];  // The letter
                        const plateDigits = plateNo.substring(4);  // The last digits

                        // Convert the numbers to Persian digits
                        const persianIranNo = toPersianDigits(iranNo);
                        const persianPlateNumber = toPersianDigits(plateNumber);
                        const persianPlateDigits = toPersianDigits(plateDigits);

                        // Populate the plate fields
                        document.getElementById('plate-iranNo-strong').textContent = persianIranNo;
                        document.getElementById('plate-letter').textContent = persianPlateNumber; // Letters stay the same
                        document.getElementById('plate-number').textContent = plateLetter + ' ' + persianPlateDigits;

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

        document.getElementById('editUserForm').addEventListener('submit', function (event) {
            event.preventDefault();

            const userData = {
                fullname: document.getElementById('fullname').value,
                priority: document.getElementById('priority').value,
                username: document.getElementById('username').value,
                password: document.getElementById('password').value,
                active: document.getElementById('active').checked
            };

            fetch('/update_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            })
                .then(response => response.json())
                .then(data => {
                    console.log(data.message);
                    closeModal();
                    location.reload(); // Reload the page to reflect changes
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

    function onDeleteUser() {
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function () {
                const username = this.getAttribute('data-username');

                if (confirm(`Are you sure you want to delete user: ${username}?`)) {
                    fetch(`/delete_user/${username}`, {
                        method: 'POST'
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log(data.message);
                        location.reload(); // Reload the page to reflect changes
                    });
                }
            });
        });
    }

    // Function to convert numbers to Persian digits
    function toPersianDigits(num) {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, (digit) => persianDigits[digit]);
    }
});
