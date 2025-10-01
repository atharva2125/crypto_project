 // src/auth/auth.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Snackbar, Alert } from '@mui/material';

// Create a context to share user information
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setAlert({
          open: true,
          message: `Welcome back, ${currentUser.email}!`,
          type: 'success'
        });
      }
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setAlert({
        open: true,
        message: 'Logged out successfully!',
        type: 'success'
      });
    } catch (error) {
      setAlert({
        open: true,
        message: error.message,
        type: 'error'
      });
      console.error("Error logging out:", error);
    }
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  return (
    <AuthContext.Provider value={{ user, logout, setAlert }}>
      {children}
      <Snackbar 
        open={alert.open} 
        autoHideDuration={3000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alert.type}
          variant="filled"
          sx={{ width: '100%' }}
          elevation={6}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </AuthContext.Provider>
  );
};

// Custom hook to use the Auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
