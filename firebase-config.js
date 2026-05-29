// Firebase config — shared across all pages
// initializeApp called here once; other scripts just use window._db
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCXT-pO8qPgaeabkOaTMDJ7vWK8T3WOjbk",
  authDomain: "portfolio-57af9.firebaseapp.com",
  projectId: "portfolio-57af9",
  storageBucket: "portfolio-57af9.firebasestorage.app",
  messagingSenderId: "786284358082",
  appId: "1:786284358082:web:3df55abdc2fc462dfe4e5b",
  measurementId: "G-42SR48H2VZ"
};

if (!firebase.apps.length) {
  firebase.initializeApp(window.FIREBASE_CONFIG);
}
window._db = firebase.firestore();
window._auth = firebase.auth ? firebase.auth() : null;
