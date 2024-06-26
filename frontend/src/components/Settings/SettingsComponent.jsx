import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Switch, FormControlLabel, Button, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Head from "../Head/Head"
import Navbar from "../Navbar/Navbar"

const SettingsComponent = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: false,
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem('settings');
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings));
    }
  }, []);

  const handleToggle = (field) => {
    const updatedSettings = { ...settings, [field]: !settings[field] };
    setSettings(updatedSettings);
    localStorage.setItem('settings', JSON.stringify(updatedSettings));
  };

  const handleSave = () => {
    localStorage.setItem('settings', JSON.stringify(settings));
    navigate('/profile'); // Navigate back to profile page
  };

  const goToCredits = () => {
    navigate('/credits');
  };


  return (
    <div>
    <Head/>
    <Container>
      
      <Box display="flex" alignItems="center" flexDirection="column" mt={5}>
        {/* <Typography variant="h4" gutterBottom>
          Einstellungen
        </Typography> */}
        <Box width="100%" maxWidth={600}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.darkMode}
                onChange={() => handleToggle('darkMode')}
              />
            }
            label="Dark Mode"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications}
                onChange={() => handleToggle('notifications')}
              />
            }
            label="Push-Nachrichten"
          />
        </Box>
        <Box display="flex" justifyContent="center" mt={4}>
          <Button variant="contained" color="primary" onClick={handleSave}>
            Speichern
          </Button>
        </Box>
        <Box display="flex" justifyContent="center" mt={4}>
          <Link color="primary" onClick={goToCredits}>
            Credits
          </Link>
        </Box>
      </Box>
      {/* <Navbar/> */}
    </Container>
    </div>
  );
};

export default SettingsComponent;
