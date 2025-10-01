import React from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Container,
  MenuItem,
  Select,
  Toolbar,
  Typography,
  Avatar,
} from "@material-ui/core";
import {
  createTheme,
  makeStyles,
  ThemeProvider,
} from "@material-ui/core/styles";
import { useNavigate } from "react-router-dom"; // Use useNavigate instead of useHistory
import { useCrypto } from "../CryptoContext"; // Custom hook to get currency context
import { useAuth } from "../auth/auth"; // Import useAuth hook

const useStyles = makeStyles((theme) => ({
  title: {
    flex: 1,
    color: "gold",
    fontFamily: "Montserrat",
    fontWeight: "bold",
    cursor: "pointer",
  },
  avatar: {
    marginLeft: 15,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    padding: 0,
  },
  buttonList: {
    listStyle: 'none',
    display: 'flex',
    gap: '10px',
    marginRight: '20px',
    marginLeft: 'auto', // This will push the menu to the right
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between', // This ensures proper spacing
    width: '100%',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  button: {
    backgroundColor: '#1a1a1d',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.3s ease', // Smooth transition for hover
    '&:hover': {
      backgroundColor: '#d4af37', // Light golden color on hover
    },
  },
  icon: {
    marginRight: '5px',
  }
}));

const darkTheme = createTheme({
  palette: {
    primary: {
      main: "#fff",
    },
    type: "dark",
  },
});

const Header = () => {
  const classes = useStyles();
  const { currency, setCurrency } = useCrypto(); // Custom hook for currency handling
  const navigate = useNavigate(); // Use useNavigate for routing
  const { user, logout, setAlert } = useAuth(); // Get user and logout function from auth context

  const handleProfileClick = () => {
    if (user) {
      navigate("/profile");
    } else {
      setAlert({
        open: true,
        message: "Please login to view your profile",
        type: "info"
      });
      navigate("/login");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      setAlert({
        open: true,
        message: "Failed to logout. Please try again.",
        type: "error"
      });
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      <div className="menubar">
        <ThemeProvider theme={darkTheme}>
          <AppBar color="transparent" position="static">
            <Container>
              <Toolbar className={classes.toolbar}>
                <Typography
                  onClick={() => navigate(`/`)} // Navigate to home on click
                  variant="h6"
                  className={classes.title}
                >
                  Crypto Hunter
                </Typography>

                <div className={classes.rightSection}>
                  <ul className={classes.buttonList}>
                    <li>
                      <Link to="/news" className={classes.button}>
                        <i className={`fa fa-newspaper-o ${classes.icon}`} aria-hidden="true"></i>News
                      </Link>
                    </li>
                    <li>
                      <Link to="/Comparison" className={classes.button}>
                        <i className={`fa fa-exchange ${classes.icon}`} aria-hidden="true"></i>Comparison
                      </Link>
                    </li>
                    <li>
                      <Link to="/PriceAlertForm" className={classes.button}>
                        <i className={`fa fa-bell ${classes.icon}`} aria-hidden="true"></i>Alert
                      </Link>
                    </li>
                    <li>
                      <Link to="/PriceForecast" className={classes.button}>
                        <i className={`fa fa-line-chart ${classes.icon}`} aria-hidden="true"></i>Forecast
                      </Link>
                    </li>
                    {!user ? (
                      <li>
                        <Link to="/login" className={classes.button}>
                          <i className={`fa fa-sign-in ${classes.icon}`} aria-hidden="true"></i>Login
                        </Link>
                      </li>
                    ) : (
                      <li>
                        <button onClick={handleLogout} className={classes.button}>
                          <i className={`fa fa-sign-out ${classes.icon}`} aria-hidden="true"></i>Logout
                        </button>
                      </li>
                    )}
                  </ul>

                  <Select
                    variant="outlined"
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={currency}
                    style={{ width: 100, height: 40 }}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <MenuItem value={"USD"}>USD</MenuItem>
                    <MenuItem value={"INR"}>INR</MenuItem>
                  </Select>
                  {/* Show avatar only when user is logged in */}
                  {user && (
                    <button className={classes.avatar} onClick={handleProfileClick}>
                      <Avatar 
                        alt={user.displayName || "User Profile"}
                        src={user.photoURL || "p1.png"}
                      />
                    </button>
                  )}
                </div>
              </Toolbar>
            </Container>
          </AppBar>
        </ThemeProvider>
      </div>
    </>
  );
};
export default Header;