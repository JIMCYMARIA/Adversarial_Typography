import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

def train_and_evaluate(csv_path="spam.csv"):
    # Load dataset
    df = pd.read_csv(csv_path, encoding="latin-1")

    # Keep required columns
    df = df[['v1', 'v2']]

    # Rename columns
    df.columns = ['label', 'message']

    # Convert labels: 'ham' -> 0 (non-spam), 'spam' -> 1 (spam)
    df['label'] = df['label'].map({
        'ham': 0,
        'spam': 1
    })

    # Features and target
    X = df['message']
    y = df['label']

    # Train test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # TF-IDF Vectorization
    vectorizer = TfidfVectorizer(stop_words='english')
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # Train Multinomial Naive Bayes Model
    model = MultinomialNB()
    model.fit(X_train_vec, y_train)

    # Predict and evaluate
    y_pred = model.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    
    print(f"Model Accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:\n", classification_report(y_test, y_pred))

    return model, vectorizer

def predict_message(model, vectorizer, text):
    text_vec = vectorizer.transform([text])
    prediction = model.predict(text_vec)[0]
    return "Spam" if prediction == 1 else "Ham (Not Spam)"

if __name__ == "__main__":
    try:
        model, vectorizer = train_and_evaluate("spam.csv")
        sample_text = "Free entry in 2 a wkly comp to win FA Cup final tkts 21st May 2005."
        res = predict_message(model, vectorizer, sample_text)
        print(f"\nSample Prediction:\n'{sample_text}' -> {res}")
    except FileNotFoundError:
        print("spam.csv not found. Please ensure 'spam.csv' is placed in the project directory.")
