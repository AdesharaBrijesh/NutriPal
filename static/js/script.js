let calorieChart;

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function login(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "Login successful") {
            window.location.reload();
        } else {
            alert(data.message);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function register(event) {
    event.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const weight = document.getElementById('weight').value;
    const height = document.getElementById('height').value;
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const activity_level = document.getElementById('activity_level').value;

    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, weight, height, age, gender, activity_level }),
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.message === "User registered successfully") {
            showLoginForm();
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function calculateNutrition() {
    fetch('/calculate', {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `<p><strong>BMR:</strong> ${data.bmr.toFixed(2)} kJ</p>`;
        resultsDiv.innerHTML += `<p><strong>Total daily calorie needs:</strong> ${data.calorie_needs_kj.toFixed(2)} kJ</p>`;

        if (data.meals.length > 0) {
            data.meals.forEach(meal => {
                resultsDiv.innerHTML += `
                    <div class="meal">
                        <p><strong>Food Link:</strong> <a href="${meal.food_link}" target="_blank">${meal.food_link}</a></p>
                        <p><strong>Name:</strong> ${meal.name}</p>
                        <p><strong>Brand:</strong> ${meal.brand}</p>
                        <p><strong>Nutri Score:</strong> ${meal.nutri_score}</p>
                        <p><strong>Processing Score:</strong> ${meal.processing_score}</p>
                        <p><strong>Nutri Energy:</strong> ${meal.nutri_energy !== 'N/A' ? meal.nutri_energy.toFixed(2) + ' kJ' : 'N/A'}</p>
                        <p><strong>Nutri Fat:</strong> ${meal.nutri_fat}</p>
                        <p><strong>Nutri Saturated Fat:</strong> ${meal.nutri_satuFat}</p>
                        <p><strong>Nutri Carbohydrate:</strong> ${meal.nutri_carbohydrate}</p>
                        <p><strong>Nutri Sugar:</strong> ${meal.nutri_sugar}</p>
                        <p><strong>Nutri Fiber:</strong> ${meal.nutri_fiber}</p>
                        <p><strong>Nutri Protein:</strong> ${meal.nutri_protein}</p>
                        <p><strong>Nutri Salt:</strong> ${meal.nutri_salt}</p>
                    </div>
                `;
            });
        } else {
            resultsDiv.innerHTML += `<p>No suitable meals found.</p>`;
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function logFood() {
    const date = document.getElementById('foodDate').value;
    const mealType = document.getElementById('mealType').value;
    const foodName = document.getElementById('foodName').value;
    const calories = document.getElementById('foodCalories').value;

    fetch('/log_food', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, mealType, foodName, calories }),
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        getFoodDiary();
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function getFoodDiary() {
    fetch('/get_food_diary')
    .then(response => response.json())
    .then(data => {
        const diaryDiv = document.getElementById('foodDiary');
        diaryDiv.innerHTML = '<h3>Food Diary</h3>';
        data.forEach(entry => {
            diaryDiv.innerHTML += `
                <p>${entry.date} - ${entry.mealType}: ${entry.foodName} (${entry.calories} calories)</p>
            `;
        });
        updateCalorieChart(data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function updateCalorieChart(data) {
    const ctx = document.getElementById('calorieChart').getContext('2d');
    
    // Group data by date and sum calories
    const groupedData = data.reduce((acc, entry) => {
        const date = entry.date;
        if (!acc[date]) {
            acc[date] = 0;
        }
        acc[date] += entry.calories;
        return acc;
    }, {});

    const dates = Object.keys(groupedData).sort();
    const calories = dates.map(date => groupedData[date]);

    if (calorieChart) {
        calorieChart.destroy();
    }

    calorieChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Calories Consumed',
                data: calories,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Call getFoodDiary when the page loads to display the initial data
document.addEventListener('DOMContentLoaded', () => {
    getFoodDiary();
    // Close the modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == document.getElementById('loginModal')) {
            closeLoginModal();
        }
    }
});