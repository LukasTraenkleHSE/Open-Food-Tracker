import React, { useEffect, useState } from 'react';
import { Grid, Typography, CircularProgress, Box, IconButton, Card, CardContent } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import BreakfastDiningIcon from '@mui/icons-material/BreakfastDining';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import CookieIcon from '@mui/icons-material/Cookie';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, addDays, subDays } from 'date-fns'; // Library for date manipulation

const calculateDailyCalorieGoal = (currentWeight, goalWeight) => {
  const weightDifference = currentWeight - goalWeight;
  const baseCalories = currentWeight * 24; // Grobe Schätzung: 24 Kalorien pro Kilogramm Körpergewicht pro Tag

  // Wenn das Zielgewicht kleiner ist als das aktuelle Gewicht, reduzieren wir die Kalorienzufuhr
  // Wenn das Zielgewicht größer ist als das aktuelle Gewicht, erhöhen wir die Kalorienzufuhr
  const calorieAdjustment = weightDifference * 10; // Beispielsweise 10 Kalorien pro kg Unterschied
  return baseCalories - calorieAdjustment;
};

const HomeComponent = ({ userData, token }) => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date()); // Use Date for date manipulation
  const navigate = useNavigate();

  useEffect(() => {
    console.log('User data in useEffect:', userData);
    if (userData && userData.weight && userData.goal) {
      fetchMeals(selectedDate);
    } else {
      console.error('User data or userId is missing');
      setLoading(false);
    }
  }, [selectedDate, userData, token]);

  // Berechnung des Tagesziels basierend auf Benutzergewicht und Zielgewicht
  const dailyCalorieGoal = userData && userData.weight && userData.goal
    ? calculateDailyCalorieGoal(userData.weight, userData.goal)
    : 2000; // Defaultwert, falls userData fehlt

  const fetchMeals = async (date) => {
    setLoading(true);
    const formattedDate = format(date, 'yyyy-MM-dd');
    const userId = userData ? userData._id : '';

    console.log('Fetching meals for user:', userId, 'on date:', formattedDate);

    try {
      const response = await axios.get(`/api/meals/day/${userId}/${formattedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const mealsData = response.data;
      console.log('Fetched meals:', mealsData);
      const mealIcons = {
        breakfast: <BreakfastDiningIcon fontSize="large" />,
        lunch: <LunchDiningIcon fontSize="large" />,
        dinner: <DinnerDiningIcon fontSize="large" />,
        snack: <CookieIcon fontSize="large" />
      };

      const mappedMeals = ['breakfast', 'lunch', 'dinner', 'snack'].map(occasion => {
        const items = mealsData[occasion] || [];
        const totalNutrients = items.reduce((totals, item) => {
          totals.calories += item.kcal;
          totals.protein += item.protein;
          totals.fat += item.fat;
          totals.carbs += item.carbs;
          return totals;
        }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

        return {
          name: occasion,
          items,
          icon: mealIcons[occasion],
          totalNutrients: {
            calories: Math.round(totalNutrients.calories),
            protein: Math.round(totalNutrients.protein),
            fat: Math.round(totalNutrients.fat),
            carbs: Math.round(totalNutrients.carbs)
          }
        };
      });

      setMeals(mappedMeals);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching meals:", error);
      // Set default empty meals if none found
      const mealIcons = {
        breakfast: <BreakfastDiningIcon fontSize="large" />,
        lunch: <LunchDiningIcon fontSize="large" />,
        dinner: <DinnerDiningIcon fontSize="large" />,
        snack: <CookieIcon fontSize="large" />
      };
      const defaultMeals = ['breakfast', 'lunch', 'dinner', 'snack'].map(occasion => ({
        name: occasion,
        items: [],
        icon: mealIcons[occasion],
        totalNutrients: { calories: 0, protein: 0, fat: 0, carbs: 0 }
      }));
      setMeals(defaultMeals);
      setLoading(false);
    }
  };

  const handleCardClick = (occasion) => {
    localStorage.setItem('occasion', occasion);
    navigate('/occasionMeals');
  };

  const handlePrevDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const calculateTotalNutrients = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    meals.forEach(meal => {
      totalCalories += meal.totalNutrients.calories;
      totalProtein += meal.totalNutrients.protein;
      totalFat += meal.totalNutrients.fat;
      totalCarbs += meal.totalNutrients.carbs;
    });

    return { totalCalories, totalProtein, totalFat, totalCarbs };
  };

  const totalNutrients = calculateTotalNutrients();

  // Anpassung des CircularProgress-Wertes basierend auf dem Tagesziel
  const progressValue = Math.min(totalNutrients.totalCalories / dailyCalorieGoal * 100, 100);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={2}>
          <IconButton onClick={handlePrevDay}>
            <ArrowBack />
          </IconButton>
        </Grid>
        <Grid item xs={8} sx={{ textAlign: 'center' }}>
          <Typography variant="h6">{format(selectedDate, 'yyyy-MM-dd')}</Typography>
        </Grid>
        <Grid item xs={2} sx={{ textAlign: 'right' }}>
          <IconButton onClick={handleNextDay}>
            <ArrowForward />
          </IconButton>
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ padding: 2 }}>
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress variant="determinate" value={progressValue} size={140} thickness={4} />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h5" component="div">
                {totalNutrients.totalCalories} kcal
              </Typography>
            </Box>
          </Box>
        </Grid>
        {meals.map((meal, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Card 
              onClick={() => handleCardClick(meal.name)}
              sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                  {meal.name.charAt(0).toUpperCase() + meal.name.slice(1)}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2">{meal.totalNutrients.calories} kcal</Typography>
                  <Typography variant="body2">{meal.totalNutrients.protein}g Protein</Typography>
                  <Typography variant="body2">{meal.totalNutrients.fat}g Fat</Typography>
                  <Typography variant="body2">{meal.totalNutrients.carbs}g Carbs</Typography>
                </Box>
              </CardContent>
              <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }}>
                {meal.icon}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default HomeComponent;