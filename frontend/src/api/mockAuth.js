// Fake database
const getUsers = () => {
  return JSON.parse(localStorage.getItem("users")) || [];
};

const saveUsers = (users) => {
  localStorage.setItem("users", JSON.stringify(users));
};

// SIGNUP
export const signup = async (form) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getUsers();

      const exists = users.find((u) => u.email === form.email);
      if (exists) {
        reject({ message: "User already exists" });
        return;
      }

      users.push(form);
      saveUsers(users);

      resolve({ message: "Signup successful" });
    }, 1000);
  });
};

// LOGIN
export const login = async ({ email, password }) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getUsers();

      const user = users.find(
        (u) => u.email === email && u.password === password
      );

      if (!user) {
        reject({ message: "Invalid credentials" });
        return;
      }

      resolve({
        token: "fake-jwt-token",
        user,
      });
    }, 1000);
  });
};