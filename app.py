from flask import Flask, request, render_template, jsonify, session, redirect, url_for
import pandas as pd
import csv
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import re  # Add this line to import the re module

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here'  # Change this to a random secret key

# Load the dataset from CSV
file_path = 'Indian_Food_DF.csv'
df = pd.read_csv(file_path)

# Helper functions
def extract_nutri_energy(value):
    if isinstance(value, str):
        match = re.search(r'([\d,]+)\s*kJ', value)
        if match:
            return float(match.group(1).replace(',', ''))
        match = re.search(r'([\d,]+)\s*kcal', value)
        if match:
            return float(match.group(1).replace(',', '')) * 4.184
    return None

df['nutri_energy'] = df['nutri_energy'].apply(extract_nutri_energy)

def calculate_bmr(weight, height, age, gender):
    if gender.lower() == 'male':
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    elif gender.lower() == 'female':
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    else:
        raise ValueError("Gender must be 'male' or 'female'")
    return bmr

def calculate_calories(bmr, activity_level):
    activity_factors = {
        'sedentary': 1.2,
        'lightly active': 1.375,
        'moderately active': 1.55,
        'very active': 1.725,
        'extra active': 1.9
    }
    if activity_level.lower() in activity_factors:
        return bmr * activity_factors[activity_level.lower()]
    else:
        raise ValueError("Invalid activity level")

def get_top_5_closest_meals(calorie_needs_kj, df):
    valid_meals = df[df['nutri_energy'] <= calorie_needs_kj].copy()
    if not valid_meals.empty:
        valid_meals['difference'] = (valid_meals['nutri_energy'] - calorie_needs_kj).abs()
        top_5_meals = valid_meals.sort_values(by='difference').head(5)
        top_5_meals.fillna('N/A', inplace=True)
        return top_5_meals.to_dict(orient='records')
    else:
        return []

def get_user(username):
    with open('data/users.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['username'] == username:
                return row
    return None

def add_user(username, password, weight, height, age, gender, activity_level):
    with open('data/users.csv', 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([username, generate_password_hash(password), weight, height, age, gender, activity_level])

# Modify the index route
@app.route('/')
def index():
    if 'username' in session:
        return render_template('index.html', username=session['username'])
    return render_template('index.html')

# Add this new route
@app.route('/profile')
def profile():
    if 'username' not in session:
        return redirect(url_for('login'))
    user = get_user(session['username'])
    return render_template('profile.html', user=user)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = get_user(username)
        if user and check_password_hash(user['password'], password):
            session['username'] = username
            return redirect(url_for('index'))
        return render_template('login.html', error='Invalid username or password')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        weight = request.form['weight']
        height = request.form['height']
        age = request.form['age']
        gender = request.form['gender']
        activity_level = request.form['activity_level']
        
        if get_user(username):
            return render_template('register.html', error='Username already exists')
        
        add_user(username, password, weight, height, age, gender, activity_level)
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/calculate', methods=['POST'])
def calculate():
    if 'username' not in session:
        return jsonify({"message": "Please log in"}), 401

    user = get_user(session['username'])
    
    bmr = calculate_bmr(float(user['weight']), float(user['height']), int(user['age']), user['gender'])
    calorie_needs_kj = calculate_calories(bmr, user['activity_level'])
    
    top_meals = get_top_5_closest_meals(calorie_needs_kj, df)
    
    return jsonify({
        'bmr': bmr,
        'calorie_needs_kj': calorie_needs_kj,
        'meals': top_meals
    })

@app.route('/log_food', methods=['POST'])
def log_food():
    if 'username' not in session:
        return jsonify({"message": "Please log in"}), 401

    data = request.json
    with open('data/food_diary.csv', 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([session['username'], data['date'], data['mealType'], data['foodName'], data['calories']])
    return jsonify({"message": "Food logged successfully"}), 201

@app.route('/get_food_diary', methods=['GET'])
def get_food_diary():
    if 'username' not in session:
        return jsonify({"message": "Please log in"}), 401

    diary = []
    with open('data/food_diary.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['username'] == session['username']:
                diary.append({
                    'date': row['date'],
                    'mealType': row['meal_type'],
                    'foodName': row['food_name'],
                    'calories': float(row['calories'])
                })
    return jsonify(diary)

if __name__ == '__main__':
    if not os.path.exists('data'):
        os.makedirs('data')
    if not os.path.exists('data/users.csv'):
        with open('data/users.csv', 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['username', 'password', 'weight', 'height', 'age', 'gender', 'activity_level'])
    if not os.path.exists('data/food_diary.csv'):
        with open('data/food_diary.csv', 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['username', 'date', 'meal_type', 'food_name', 'calories'])
    app.run(debug=True)