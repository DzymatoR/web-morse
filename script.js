
// definice proměnných

let inputTxt = document.querySelector("#inputTxt");
let outputTxt = document.querySelector("#outputTxt");
const preloz = document.querySelector("#translateButton");
const reset = document.querySelector("#resetButton");

const slovnik = {
    // písmena
    "a":".-", "á":".-",
    "b":"-...",
    "c":"-.-.", "č":"-.-.",
    "d":"-..", "ď":"-..",
    "e":".", "é":".", "ě":".",
    "f":"..-.",
    "g":"--.",
    "h":"....",
    "ch":"----",
    "i":"..", "í":"..",
    "j":".---",
    "k":"-.-",
    "l":".-..",
    "m":"--",
    "n":"-.", "ň":"-.",
    "o":"---", "ó":"---",
    "p":".--.",
    "q":"--.-",
    "r":".-.", "ř":".-.",
    "s":"...", "š":"...",
    "t":"-", "ť":"-",
    "u":"..-", "ú":"..-", "ů":"..-", 
    "v":"...-",
    "w":".--",
    "x":"-..-",
    "y":"-.--", "ý":"-.--",
    "z":"--..", "ž":"--..",
    " ":"",
    // čísla
    "1":".----",
    "2":"..---",
    "3":"...--",
    "4":"....-",
    "5":".....",
    "6":"-....",
    "7":"--...",
    "8":"---..",
    "9":"----.",
    "0":"-----",
    // speciální znaky
    "?":"..--..",
    ",":"--..--",
    "!":"--...-",
    ".":".-.-.-",
    ";":"-.-.-.",
    "/":"-..-.",
    "=":"-...-",
    "-":"-....-",
    "'":".----.",
    "(":"-.--.",
    ")":"-.--.-",
    "\"":".-..-.",
    ":":"---...",
    "_":"..--.-",
    "+":".-.-.",
    "@":".--.-.",
}


// definice funkcí

<<<<<<< HEAD
function ToMorse(){
=======
function TxtToMorse(){
>>>>>>> dfa1ba2d513ea63a44d5dde0ee0cca87429239f1

    let LowerCase = inputTxt.value.toLowerCase();
    outputTxt.value = "";
       
    for (n=0; n<LowerCase.length; n++){
        outputTxt.value = outputTxt.value + slovnik[LowerCase[n]]+"/"; 
    }
 }

<<<<<<< HEAD
=======

function MorseToTxt(){

    let morseInput = inputTxt.split("/");
    console.log(morseInput);
}

>>>>>>> dfa1ba2d513ea63a44d5dde0ee0cca87429239f1
function Resetuj (){
    inputTxt.value = "";
    outputTxt.value = "";
}

<<<<<<< HEAD
// // definice běhu aplikace
=======
// definice běhu aplikace

preloz.addEventListener("click", TxtToMorse);
reset.addEventListener("click", Resetuj);
>>>>>>> dfa1ba2d513ea63a44d5dde0ee0cca87429239f1

// preloz.addEventListener("click", ToMorse);

inputTxt.addEventListener("keyup",ToMorse);
reset.addEventListener("click", Resetuj);




