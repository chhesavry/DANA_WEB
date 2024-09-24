let currentData = []; // Store the currently loaded data
let currentFile = ''; // Store the name of the currently loaded file
let currentRowCount = 20; // Default row count
let editRowIndex = -1; // Store index of the row being edited

// Function to show the edit modal
function showEditModal(item, index) {
    document.getElementById('edit-date').value = item.date;
    document.getElementById('edit-type').value = item.type;
    document.getElementById('edit-order-id').value = item.orderid;
    document.getElementById('edit-source-account').value = item.src_acc_name;
    document.getElementById('edit-total').value = item.total;
    document.getElementById('edit-user-name').value = item.user_name || '';
    document.getElementById('edit-status').value = item.status || 'Pending'; // Set default

    editRowIndex = index; // Save index for later use
    document.getElementById('edit-modal').style.display = 'block'; // Show the modal
}

// Event listener for the close button of the modal
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('edit-modal').style.display = 'none'; // Close the modal
});

// Event listener for saving changes
document.getElementById('save-changes').addEventListener('click', () => {
    const updatedItem = {
        date: document.getElementById('edit-date').value,
        type: document.getElementById('edit-type').value,
        orderid: document.getElementById('edit-order-id').value,
        src_acc_name: document.getElementById('edit-source-account').value,
        total: document.getElementById('edit-total').value,
        user_name: document.getElementById('edit-user-name').value,
        status: document.getElementById('edit-status').value === 'Pending' ? '' : document.getElementById('edit-status').value,
    };

    if (editRowIndex !== -1) {
        // Show confirmation alert
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to save these changes?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, save it!',
            cancelButtonText: 'No, cancel!'
        }).then((result) => {
            if (result.isConfirmed) {
                // Update the current data
                currentData[currentData.length - currentRowCount + editRowIndex] = updatedItem;
                renderTable(currentData);
                sumTotals(currentData); // Update totals after editing

                // Send updated data to the server
                fetch('/update-file', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        file: currentFile,
                        index: currentData.length - currentRowCount + editRowIndex,
                        item: updatedItem
                    })
                })
                .then(response => response.json())
                .then(data => {
                    console.log(data.message || data.error);
                    Swal.fire('Saved!', 'Your changes have been saved.', 'success');
                })
                .catch(err => console.error('Error updating file:', err));

                document.getElementById('edit-modal').style.display = 'none';
            }
        });
    }
});

// Update renderTable function to add double-click event listener
function renderTable(data) {
    const tbody = document.getElementById('attendance-data');
    tbody.innerHTML = ''; // Clear previous data

    // Get selected row count
    currentRowCount = document.getElementById('row-count-filter').value;
    if (currentRowCount === "All") {
        currentRowCount = data.length;
    } else {
        currentRowCount = parseInt(currentRowCount);
    }

    // Get the last 'currentRowCount' items
    const slicedData = data.slice(-currentRowCount); // Get the last N items

    slicedData.forEach((item, index) => {
        const row = document.createElement('tr');
        // Add class for CR or DB rows
        if (item.type === 'CR') {
          row.classList.add('cr-row');
      } else if (item.type === 'DB') {
          row.classList.add('db-row');
      }
        // Determine the status based on the conditions
        const status = determineStatus(item);

        row.innerHTML = `
            <td>${data.length - (slicedData.length - index)}</td>
            <td>${item.date}</td>
            <td>${item.type}</td>
            <td>${item.orderid}</td>
            <td>${item.src_acc_name}</td>
            <td>${formatCurrency(item.total)}</td>
            <td>${item.user_name || ''}</td>
            <td>${status}</td>
        `;

        // Add double-click event listener to the user name cell
        row.cells[6].addEventListener('dblclick', () => {
            showEditModal(item, index); // Show the edit modal with the row data
        });

        // Add click event only to the index cell for copying data
        row.cells[0].addEventListener('click', () => {
            copyRowsData(slicedData, index); // Copy data from clicked row to clipboard
        });

        tbody.appendChild(row);
    });

    sumTotals(data); // Calculate and display totals
}

// Function to calculate and display totals
function sumTotals(data) {
    let crTotal = 0;
    let dbTotal = 0;

    data.forEach(item => {
        if (item.type === "CR") {
            crTotal += parseFloat(item.total);
        } else if (item.type === "DB") {
            dbTotal += parseFloat(item.total);
        }
    });

    // Update totals display
    document.getElementById('total-cr').innerText = formatCurrency(crTotal);
    document.getElementById('total-db').innerText = formatCurrency(dbTotal);
}

// Function to show the loading spinner
function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = 'flex'; // Show the spinner
}

// Function to hide the loading spinner
function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = 'none'; // Hide the spinner
}

// Fetch the list of JSON files from the server
fetch('/list-files')
    .then(response => response.json())
    .then(data => {
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = ''; // Clear any existing list

        data.files.forEach((file) => {
            if (file === 'config.json') return; // Skip the config file

            const fileNameWithoutExtension = file.replace('.json', ''); // Remove the .json extension
            const listItem = document.createElement('li');
            listItem.innerHTML = `<a href="#" onclick="loadFile('${file}')">${fileNameWithoutExtension}</a>`; // Display without .json
            fileList.appendChild(listItem);
        });
    })
    .catch(error => console.error('Error loading file list:', error));

// Function to load the selected JSON file into the attendance table
function loadFile(fileName) {
    showSpinner(); // Show spinner before loading
    currentFile = fileName; // Update the current file variable
    fetch(`/get-file?file=${fileName}`)
        .then(response => response.json())
        .then(data => {
            currentData = data; // Save the loaded data
            renderTable(currentData); // Render the initial data
        })
        .catch(error => console.error('Error loading JSON data:', error))
        .finally(() => hideSpinner()); // Hide spinner after loading
}

// Function to determine the status based on the conditions
function determineStatus(item) {
    if (!item.user_name) {
        if (item.type === 'CR') {
            return 'Pending';
        } else if (item.type === 'DB') {
            return 'Withdraw';
        }
    }
    return item.status; // Default status if conditions don't match
}

// Function to format the total amount
function formatCurrency(amount) {
    return `Rp ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

// Function to copy data from clicked row to the last row to clipboard
function copyRowsData(data, startIndex) {
    let textToCopy = '';

    // Iterate from the clicked row to the last row
    for (let i = startIndex; i < data.length; i++) {
        const item = data[i];
        const total = item.total; // Get total without Rp

        // Format data based on type
        if (item.type === 'CR') {
            textToCopy += `${item.src_acc_name}\t${total}\t\t\t\t${item.user_name || ''}\n`;
        } else if (item.type === 'DB') {
            textToCopy += `${item.src_acc_name}\t\t-${total}\t\t\t\t${item.user_name || ''}\n`;
        }
    }

    // Copy the text to the clipboard
    navigator.clipboard.writeText(textToCopy.trim())
        .then(() => {
            showAlert('Data copied to clipboard!'); // Show alert on success
        })
        .catch(err => {
            console.error('Could not copy text: ', err);
        });
}

// Function to show alert message
function showAlert(message) {
    const alertBox = document.createElement('div');
    alertBox.textContent = message;
    alertBox.style.position = 'fixed';
    alertBox.style.top = '20px';
    alertBox.style.right = '20px';
    alertBox.style.backgroundColor = '#4CAF50'; // Green background
    alertBox.style.color = 'white';
    alertBox.style.padding = '10px 20px';
    alertBox.style.borderRadius = '5px';
    document.body.appendChild(alertBox);

    // Remove the alert after 1 second
    setTimeout(() => {
        document.body.removeChild(alertBox);
    }, 1000);
}

// Function to filter the data based on selected criteria
function filterData() {
    showSpinner(); // Show spinner before filtering
    const type = document.getElementById('type-filter').value;
    const sourceAccount = document.getElementById('source-account-filter').value.toLowerCase();
    const userName = document.getElementById('user-name-filter').value.toLowerCase();
    const status = document.getElementById('status-filter').value;

    const filteredData = currentData.filter(item => {
        // Determine the status for the current item
        const itemStatus = determineStatus(item);

        return (
            (type === '' || item.type === type) &&
            (sourceAccount === '' || item.src_acc_name.toLowerCase().includes(sourceAccount)) &&
            (userName === '' || item.user_name.toLowerCase().includes(userName)) &&
            (status === '' || itemStatus === status)
        );
    });

    renderTable(filteredData); // Render filtered data
    hideSpinner(); // Hide spinner after filtering
}

// Function to refresh the data from the current JSON file
function refreshData() {
    if (currentFile) {
        showSpinner(); // Show spinner before refreshing
        loadFile(currentFile); // Reload the current file
    } else {
        console.error('No file loaded. Please select a file first.');
    }
}

// Add event listener to the search button
document.getElementById('search-button').addEventListener('click', filterData);

// Add event listener to the refresh button
document.getElementById('refresh-button').addEventListener('click', refreshData);

// Add event listener for row count filter
document.getElementById('row-count-filter').addEventListener('change', () => {
    renderTable(currentData); // Re-render table when row count changes
});

// Hide the loading spinner once the page is fully loaded
window.addEventListener('load', () => {
    hideSpinner(); // Hide the spinner
});
