const { UserMeals, MealSchema } = require('../models/userMealsModel');
const Meal = require('../models/mealModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

// get all meals for a user
const getUserMeals = async (req, res) => {
    const { userId } = req.params; // Angenommen, wir filtern Mahlzeiten basierend auf der userId

    if (!mongoose.Types.ObjectId.isValid(userId)){
        return res.status(404).json({ error: 'Ungültige ID' });
    }

    try {
        const meals = await UserMeals.find({ userID: userId }).sort({ date: -1 });
        res.status(200).json(meals);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// get a single meal
const getMeal = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)){
        return res.status(404).json({error: 'Ungültige ID'});
    }

    const meal = await UserMeals.findById(id);

    if (!meal) {
        return res.status(404).json({error: 'Mahlzeit nicht gefunden'});
    }

    res.status(200).json(meal);
};

const getMealById = async (req, res) => {
    const { mealsFileId } = req.body;

    try {
      const meal = await UserMeals.findOne({ mealsFileId: mealsFileId });
      if (!meal) {
        return res.status(404).json({ message: 'Meal File not found' });
      }
      res.status(200).json(meal); // Senden Sie die gefundene Mahlzeit zurück
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
};

//all currently valid units
const recognizedUnits = ["ml", "l", "g", "kg"];

//gets unit from parameter unitString, if the unit is in some form in the string like: "200 kg" or "3 l"
function getUnit(unitString){
    for(let i=0; i<recognizedUnits.length; i++){
        if(unitString.includes(` ${recognizedUnits[i]}`)){
            return recognizedUnits[i];
        }
    }
    return unitString;
}


//Gets ingredient from OpenFoodFacts specified by id
const getIngredient = async (req, res) => {
    const { id } = req.params;

    let ingredientData = {};
    ingredientData.unitUnknown = false;

    await fetch(`https://world.openfoodfacts.net/api/v2/product/${id}?fields=product_name,nutriments,product_quantity_unit,quantity,image_front_url`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            return response.json(); 
        })
        .then(data => {
            try{
                const product = data.product;
                ingredientData.id = id;                                                       //gets relevant values from API and adds it to ingredientData
                ingredientData.name = product.product_name;
                ingredientData.kcal = product.nutriments['energy-kcal_100g'];
                ingredientData.protein = product.nutriments.proteins_100g;
                ingredientData.fat = product.nutriments.fat_100g;
                ingredientData.carbs = product.nutriments.carbohydrates_100g;
                ingredientData.imageUrl = product.image_front_url;
                ingredientData.unit = product.product_quantity_unit;
                ingredientData.amount = 100; 
    
                if(!ingredientData.unit || !recognizedUnits.includes(ingredientData.unit)){ //if there is no given product unit or the givn one is not recognized
                    let tempUnit = product.quantity;                                        //try to recognize it 
                    tempUnit = tempUnit.toLowerCase();
                
                    ingredientData.unit = getUnit(tempUnit);
    
                    if(!recognizedUnits.includes(ingredientData.unit)){                     //is the unit is still not recognized, set the ingredient unit to unknown
                        ingredientData.unitUnknown = true;
                    }
                } 
            } catch (error){
                console.error('There was a problem with the fetch operation:', error);
                return res.status(400).json({ error: 'Ein Fehler ist beim Zugriff auf OpenFoodFacts aufgetreten'});
            }

        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            return res.status(400).json({ error: 'Ein Fehler ist beim Zugriff auf OpenFoodFacts aufgetreten'});
    });

    try {
        return res.status(200).json(ingredientData);
    } catch (error) {
        console.log(error);
        return res.status(400).json({ error: error.message });                         
    }
};


//Creates a Meal and sets it into the right Mealschema and UserMeal, 
//Creates a MealSchema for the current user date, if it does not exist
const addMeal = async (req, res) => {
    const { mealsFileId, mealData, mealOccasion, userDate} = req.body; 

    const tempDate = new Date(userDate);                                                 //Sets up user Date and removes minutes, seconds, etc.
    const day = tempDate.getDate();
    const month = tempDate.getMonth(); 
    const year = tempDate.getFullYear();

    date = new Date(year, month , day);

    try {
        const mealsFileObject = mongoose.Types.ObjectId(mealsFileId);                   

        //Creates Meal with given data
        const newMeal = await Meal.create({ name: mealData.name, amount: mealData.amount, unit: mealData.unit,                             
            kcal: mealData.kcal, protein: mealData.protein, fat: mealData.fat, carbs: mealData.carbs, id: mealData.id, imageUrl: mealData.imageUrl });

        const updatedMealsFile = await UserMeals.findOneAndUpdate(                      //if a MealSchema with current date already exists for this UserMeal File, add Meal there
            { mealsFileId: mealsFileObject, "meals.date": date }, 
            { $push: { [`meals.$.${mealOccasion}`]: newMeal } }, 
            { new: true }
        );
        if(updatedMealsFile){
            return res.status(200).json(updatedMealsFile);                              //return updated File
        }

        const userMeal = await MealSchema.create({ date, [mealOccasion]: newMeal});     //Creates MealSchema, if none for the current date exist for this UserMeal File

        const newMealsFile = await UserMeals.findOneAndUpdate(                          //Add MealSchema and Meal into UserMeals
            { mealsFileId: mealsFileObject }, 
            { $push: { meals: userMeal } }, 
            { new: true }, 
        );

        if(newMealsFile){
            return res.status(200).json(newMealsFile);                                 
        }
    } catch (error) {
      console.error('Fehler beim Erstellen von UserMeals:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }

};

const createMeal = async (req, res) => {

    const { mealsFileId, userId, meals } = req.body;

    if (!mealsFileId) {
      return res.status(400).json({ error: 'mealsFileId ist erforderlich' });
    }
  
    if (!userId) {
      return res.status(400).json({ error: 'userId ist erforderlich' });
    }
  
    try {
      const newUserMeals = new UserMeals({ mealsFileId, userId, meals });
      await newUserMeals.save();
      res.status(201).json(newUserMeals);
    } catch (error) {
      console.error('Fehler beim Erstellen von UserMeals:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  };

// delete a meal
const deleteMeal = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({error: 'Ungültige ID'});
    }

    const meal = await UserMeals.findOneAndDelete({ _id: id });

    if (!meal) {
        return res.status(404).json({error: 'Mahlzeit nicht gefunden'});
    }

    res.status(200).json(meal);
};

// update a meal
const updateMeal = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({error: 'Ungültige ID'});
    }

    const meal = await UserMeals.findOneAndUpdate({ _id: id }, {...req.body}, { new: true });

    if (!meal) {
        return res.status(404).json({error: 'Mahlzeit nicht gefunden'});
    }

    res.status(200).json(meal);
};

const getMealsByDate = async (req, res) => {
    const { userId, date } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(404).send('Ungültige Benutzer-ID');
    }

    try {
        const userMeals = await UserMeals.findOne({ userId });

        if (!userMeals) {
            return res.status(404).send('Benutzer nicht gefunden');
        }

        // Konvertiere das übergebene Datum in das ISO-Format
        const requestedDate = new Date(date).toISOString().split('T')[0];

        // Finde die Mahlzeiten für das angegebene Datum
        const mealsForDate = userMeals.meals.find(meal => {
            const mealDate = new Date(meal.date).toISOString().split('T')[0];
            return mealDate === requestedDate;
        });

        if (!mealsForDate) {
            return res.status(404).send('Keine Mahlzeiten für dieses Datum gefunden');
        }

        res.status(200).json({
            breakfast: mealsForDate.breakfast,
            lunch: mealsForDate.lunch,
            dinner: mealsForDate.dinner,
            snack: mealsForDate.snack
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = {
    getUserMeals,
    getMeal,
    getMealById,
    createMeal,
    deleteMeal,
    updateMeal,
    getIngredient,
    addMeal,
    getMealsByDate, 
};