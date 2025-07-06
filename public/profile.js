
function fetchUserProfile() {
    fetch('/api/getUserProfile', {
        credentials: 'include',
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('profile-name').textContent = data.name;
            document.getElementById('profile-address').textContent = data.address || '';
            document.getElementById('profile-email').textContent = data.email;
            document.getElementById('profile-phone').textContent = data.phoneNumber || '';

            document.getElementById('profile-name-input').value = data.name;
            document.getElementById('profile-address-input').value = data.address || '';
            document.getElementById('profile-email-input').value = data.email;
            document.getElementById('profile-phone-input').value = data.phoneNumber || '';
        })
        .catch(error => console.error('Error fetching user profile:', error));
}

function initializeEventListeners() {

    document.getElementById('edit-button').addEventListener('click', function () {
        console.log("Edit button clicked");
        document.getElementById('profile-data').style.display = 'none';
        document.getElementById('profile-form').style.display = 'block';
    });

    document.getElementById('profile-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const updatedData = {
            name: document.getElementById('profile-name-input').value,
            address: document.getElementById('profile-address-input').value,
            email: document.getElementById('profile-email-input').value,
            phoneNumber: document.getElementById('profile-phone-input').value,
        };
        console.log("Updating profile with data:", updatedData);
        fetch('/api/updateUserProfile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
            credentials: 'include',
        })
            .then(response => {
                if (response.ok) {
                    showModalNotification('Profile updated successfully!');
                    location.reload();
                } else {
                    console.error('Failed to update profile. Response:', response);
                    showModalNotification('Failed to update profile. Please ensure you are logged in.');
                }
            })
            .catch(error => console.error('Error updating profile:', error));
    });

    document.getElementById('cancel-edit').addEventListener('click', function () {
        console.log("Cancel button clicked");
        document.getElementById('profile-data').style.display = 'block';
        document.getElementById('profile-form').style.display = 'none';
    });
}
function init() {
    fetchUserProfile();
    initializeEventListeners();
}

document.addEventListener("DOMContentLoaded", init);
