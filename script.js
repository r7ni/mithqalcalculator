const MITHQAL_TO_GRAM = 3.641667; //Bahai mithqal to gram conversion
const CURRENCY_API_URL = "https://hexarate.paikama.co/api/rates/latest/USD"; //API for currency

let lastEdited = "mithqals"; //Initialize lastEdited

// Getting gold or silver price thru the Gold-Api
async function fetchMetalPrice(metalType) {
    const url = metalType === "gold"
        ? "https://api.gold-api.com/price/XAU"
        : "https://api.gold-api.com/price/XAG";
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`SCRIPT.js: Unable to fetch ${metalType}: ${response.statusText}`);
        }
        const data = await response.json();
        return data.price / 31.1035; // Convert from troy ounces to grams
    } catch (error) {
        console.error(`SCRIPT.js: Unable to fetch ${metalType}, ERROR:`, error);
        return null;
    }
}

//This Function uses USD as  base to then get the conversion rate
async function fetchCurrencyRate(targetCurrency) {
    try {
        const response = await fetch(`${CURRENCY_API_URL}?target=${targetCurrency}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch currency rate: ${response.statusText}`);
        }
        const data = await response.json();
        return data.data.mid; // Return the exchange rate
    } catch (error) {
        console.error("SCRIPT.js: Unable to fetch currency rate, ERROR:", error);
        return null;
    }
}

//Determines which value to change - converts mithqal to money
async function updateMoneyFromMithqals() {
    if (lastEdited !== "mithqals") return; // Last edited

    const mithqals = parseFloat(document.getElementById("mithqals").value);
    const metalType = document.querySelector('input[name="metalType"]:checked').value;
    const currency = document.getElementById("currency").value;

    if (isNaN(mithqals) || mithqals <= 0) {
        document.getElementById("money").value = "";
        return;
    }

    const metalPricePerGram = await fetchMetalPrice(metalType);
    if (metalPricePerGram === null) return;

    const usdPricePerMithqal = metalPricePerGram * MITHQAL_TO_GRAM;

    if (currency === "USD") {
        document.getElementById("money").value = (mithqals * usdPricePerMithqal).toFixed(2);
    } else {
        const currencyRate = await fetchCurrencyRate(currency);
        if (currencyRate === null) return;
        const convertedValue = mithqals * usdPricePerMithqal * currencyRate;
        document.getElementById("money").value = convertedValue.toFixed(2);
    }
}

//Determines which value to change - converts money to mithqal
async function updateMithqalsFromMoney() {
    if (lastEdited !== "money") return; // Last edited

    const money = parseFloat(document.getElementById("money").value);
    const metalType = document.querySelector('input[name="metalType"]:checked').value;
    const currency = document.getElementById("currency").value;

    if (isNaN(money) || money <= 0) {
        document.getElementById("mithqals").value = "";
        return;
    }

    const metalPricePerGram = await fetchMetalPrice(metalType);
    if (metalPricePerGram === null) return;

    const usdPricePerMithqal = metalPricePerGram * MITHQAL_TO_GRAM;

    if (currency === "USD") {
        document.getElementById("mithqals").value = (money / usdPricePerMithqal).toFixed(2);
    } else {
        const currencyRate = await fetchCurrencyRate(currency);
        if (currencyRate === null) return;
        const usdValue = money / currencyRate;
        const mithqalValue = usdValue / usdPricePerMithqal;
        document.getElementById("mithqals").value = mithqalValue.toFixed(2);
    }
}


document.getElementById("mithqals").addEventListener("input", () => { //listner
    lastEdited = "mithqals"; // Check if mithqals value was changed
    updateMoneyFromMithqals();
});

document.getElementById("money").addEventListener("input", () => {
    lastEdited = "money"; // Check if money value was changed
    updateMithqalsFromMoney();
});

document.querySelectorAll('input[name="metalType"]').forEach((radio) => { // Determines which value to change
    radio.addEventListener("change", () => {
        if (lastEdited === "mithqals") {
            updateMoneyFromMithqals();
        } else {
            updateMithqalsFromMoney();
        }
    });
});

document.getElementById("currency").addEventListener("change", () => { 
    if (lastEdited === "mithqals") {
        updateMoneyFromMithqals();
    } else {
        updateMithqalsFromMoney();
    }
});
