
function sendTime() {
    Telegram.WebApp.sendData(new Date().toString());
    console.log(new Date().toString())
}