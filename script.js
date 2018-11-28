
// definice proměnných

let inputTxt = document.querySelector("#inputTxt");
let outputTxt = document.querySelector("#outputTxt");
const preloz = document.querySelector("#translateButton");
const reset = document.querySelector("#resetButton");
const prekladZ = document.querySelector("#prekladZ");

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

function prelozTo (){
    
    let LowerCase = inputTxt.value.toLowerCase();
<<<<<<< HEAD
    outputTxt.value = "";        
    
    for (n=0; n<LowerCase.length; n++){
        outputTxt.value = outputTxt.value + slovnik[LowerCase[n]]+"/"; 
    }
}
=======
    outputTxt.value = "";

    test1 = /[./-]/gm.test(LowerCase);
    test2 = /[a-zA-Z0-9]/gm.test(LowerCase);

    if (test1 == true && test2 == false){
            prekladZ.innerHTML = "MORSE"
    } else {
        prekladZ.innerHTML = "ABC";
        for (n=0; n<LowerCase.length; n++){
            outputTxt.value = outputTxt.value + slovnik[LowerCase[n]]+"/"; 
            };
    }    
}

// function ToMorse(){
           
//     for (n=0; n<LowerCase.length; n++){
//         outputTxt.value = outputTxt.value + slovnik[LowerCase[n]]+"/"; 
//     }
//  }
>>>>>>> 6040b07e1bce4f9993381fd16f330083443437d5

function Resetuj (){
    inputTxt.value = "";
    outputTxt.value = "";
}

// // definice běhu aplikace

// preloz.addEventListener("click", ToMorse);

inputTxt.addEventListener("keyup",prelozTo);
reset.addEventListener("click", Resetuj);
