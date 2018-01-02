//with interrupts parts from https://github.com/dubocr/homebridge-gpio-device/blob/master/index.js
//npm -g list | grep -i homebridge get all installed plugins


var wpi = require("wiringpi-node");
var Service, Characteristic, UUIDGen;
wpi.wiringPiSetupGpio(); //sets mode to wpi https://github.com/eugeneware/wiring-pi/blob/master/DOCUMENTATION.md#interrupts

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerAccessory("homebridge-alarmpi", "alarmpi", alarmpi);
}

function alarmpi(log, config) {

  this.name = config["name"];
  this.pinStatusZoneA = config["pinStatusZoneA"];
  this.pinStatusZoneB = config["pinStatusZoneB"];
  this.pinActiveAlert = config["pinActiveAlert"];

  this.pinSetZoneA = config["pinSetZoneA"];
  this.pinUnsetZoneA = config["pinUnsetZoneA"];

  this.pinSetZoneB = config["pinSetZoneB"];
  this.pinUnSetZoneB = config["pinUnsetZoneB"];

  this.timeoutinMs = config["timeoutinMs"] || 1000; //two buttons must not be pressed at once - this is the waiting time until the next button is pressed

  this.service = new Service.SecuritySystem(this.name);

  this.service
    .getCharacteristic(Characteristic.SecuritySystemCurrentState)
    .on('get', this.getCurrentState.bind(this));

  this.service
    .getCharacteristic(Characteristic.SecuritySystemTargetState)
    .on('get', this.getTargetState.bind(this))
    .on('set', this.setTargetState.bind(this));

    this.currentAlarmState = this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState);
    this.targetAlarmState = this.service.getCharacteristic(Characteristic.SecuritySystemTargetState);

  this.informationService = new Service.AccessoryInformation();
  this.informationService
    .setCharacteristic(Characteristic.Manufacturer, "Jablotron")
    .setCharacteristic(Characteristic.Model, "Raspberry Pi GPIO Alarm")
    .setCharacteristic(Characteristic.SerialNumber, "0.1.0")

//declaration of pins
//input pins
   wpi.pinMode(this.pinStatusZoneA, wpi.INPUT);
   wpi.pullUpDnControl(this.pinStatusZoneA, wpi.PUD_UP);
   wpi.wiringPiISR(this.pinStatusZoneA, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));

   wpi.pinMode(this.pinStatusZoneB, wpi.INPUT);
   wpi.pullUpDnControl(this.pinStatusZoneB, wpi.PUD_UP);
   wpi.wiringPiISR(this.pinStatusZoneB, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));

   wpi.pinMode(this.pinActiveAlert, wpi.INPUT);
   wpi.pullUpDnControl(this.pinActiveAlert, wpi.PUD_UP);
   wpi.wiringPiISR(this.pinActiveAlert, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));

//output pins
//checks if set and unset are the same pins - eq just send a pulse to the same port on the alarm system or if you have dedicated buttons for set and unset like a remote control

  wpi.pinMode(this.pinSetZoneA, wpi.OUTPUT);
  wpi.digitalWrite(this.pinSetZoneA, wpi.HIGH); //testing
  if(this.pinSetZoneA === this.pinUnsetZoneA){
    //do nothing as the pin is the same
  }
  else {
    wpi.pinMode(this.pinUnsetZoneA, wpi.OUTPUT);
  }

  wpi.pinMode(this.pinSetZoneB, wpi.OUTPUT);
  wpi.digitalWrite(this.pinSetZoneB, wpi.HIGH); //testing
  if(this.pinSetZoneB === this.pinUnSetZoneB){
    //do nothing as the pin is the same
  }
  else {
    wpi.pinmode(this.pinUnsetZoneB, wpi.OUTPUT);
  }


  //sets the initial state
   this.stateChange();
}

alarmpi.prototype = {

stateChange: function(callback) {
    //reads the input pins
    var statepinStatusZoneA = wpi.digitalRead(this.pinStatusZoneA);
    var statepinStatusZoneB = wpi.digitalRead(this.pinStatusZoneB);
    var statepinActiveAlert = wpi.digitalRead(this.pinActiveAlert);

    //when an alarm was triggered
    if(!statepinActiveAlert)
    {
      this.currentAlarmState = Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
      this.service
        .setCharacteristic(Characteristic.SecuritySystemCurrentState, this.currentAlarmState);
      console.log("Alarm has been activated!");
      //callback(this);
    }
    else if(!statepinStatusZoneB) //setting Away Arm Zone B + Zone A
    {
      /*if manually set for away arm on the remote, both Zones must be activated -
      with implementation only one Zone needs to be activated and the second one will be done by the program*/
      if(statepinStatusZoneA)
      {
        //enable zone A
        this.impulse(this.pinSetZoneA);
      }

      if(this.currentAlarmState == Characteristic.SecuritySystemTargetState.AWAY_ARM){
        //do nothing as the state is already set
      }
      else {
        this.currentAlarmState = Characteristic.SecuritySystemTargetState.AWAY_ARM;
        this.service
          .setCharacteristic(Characteristic.SecuritySystemCurrentState, this.currentAlarmState);
        console.log("Away Arm has been activated!");
      }
    }
    else if(!statepinStatusZoneA) //setting Stay/Night Arm Zone A
    {

      if(this.currentAlarmState == Characteristic.SecuritySystemTargetState.AWAY_ARM){
        /*if manually set for away arm on the remote, both Zones must be activated -
        with implementation only one Zone needs to be activated and the second one will be done by the program*/
        this.impulse(this.pinUnsetZoneA);
      }
      else if(this.currentAlarmState == Characteristic.SecuritySystemTargetState.STAY_ARM){
        //do nothing as the state is already set
      }
      else {
        this.currentAlarmState = Characteristic.SecuritySystemTargetState.STAY_ARM;
        this.service
          .setCharacteristic(Characteristic.SecuritySystemCurrentState, this.currentAlarmState);
        console.log("Stay Arm has been activated!");
      }
    }

    if(statepinStatusZoneA && statepinStatusZoneB && statepinActiveAlert) //checking for Disarm
    {
      if(this.currentAlarmState == Characteristic.SecuritySystemTargetState.DISARM){
        //do nothing as the state is already set
      }
      else {
        this.currentAlarmState = Characteristic.SecuritySystemTargetState.DISARM;
        this.service
          .setCharacteristic(Characteristic.SecuritySystemCurrentState, this.currentAlarmState);
          console.log("DISARM has been activated!");
        }
    }
  },

  getCurrentState: function(callback) {
    console.log("Current state is %s", this.currentAlarmState);
    callback(this.stateChange(this));
  },

  getTargetState: function(callback) {
    console.log("current targetstate is %s", this.targetAlarmState);
    callback(this.stateChange(this));
  },

  impulse: function(pin){
    wpi.digitalWrite(pin, wpi.LOW);
    console.log("Turning on Relay - pin ", pin);

    setTimeout(function(){
    					wpi.digitalWrite(pin, wpi.HIGH);
            }, this.timeoutinMs);

    console.log("Turning off Relay - pin ", pin);
  },

//reads the target state and calls functions to set the state
  setTargetState: function(state, callback){
    switch (state) {
      case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
      case Characteristic.SecuritySystemTargetState.STAY_ARM:
        this.setStay(state, callback);
        break;
      case Characteristic.SecuritySystemTargetState.AWAY_ARM:
        this.setAway(state, callback);
        break;
      case Characteristic.SecuritySystemTargetState.DISARM:
        this.setDisarmed(state, callback);
        break;
      }
      callback(null, state);
  },

//setStay, setAway and setDisarmed have a logic included to switch from SecuritySystemCurrentState to the SecuritySystemTargetState requested

  setNight: function(state, callback){
    setStay(state, callback);
  },

  setStay: function(state, callback){
    console.log("in setStay");
    switch(this.currentAlarmState)
    {
      case Characteristic.SecuritySystemTargetState.ALARM_TRIGGERED:
        this.setDisarmed(state, callback);
      case Characteristic.SecuritySystemTargetState.DISARM:
        this.impulse(this.pinSetZoneA);
        break;
      case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
      case Characteristic.SecuritySystemTargetState.STAY_ARM:
        break;
      case Characteristic.SecuritySystemTargetState.AWAY_ARM:
        this.impulse(this.pinUnSetZoneB);
        break;
    }
  },

  setAway: function(state, callback){
    console.log("in setAway");
    switch(this.currentAlarmState){
      case Characteristic.SecuritySystemTargetState.ALARM_TRIGGERED:
        this.setDisarmed(state, callback);
      case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
      case Characteristic.SecuritySystemTargetState.STAY_ARM:
        this.impulse(this.pinSetZoneB);
        break;
      case Characteristic.SecuritySystemTargetState.AWAY_ARM:
        break;
      case Characteristic.SecuritySystemTargetState.DISARM:
        this.impulse(this.pinSetZoneA);
        setTimeout(function () {}, this.timeoutinMs);
        this.impulse(this.pinSetZoneB);
        break;
    }
  },

  setDisarmed: function(state, callback){
    console.log("in setDisarmed");
    switch(this.currentAlarmState){
      case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
      case Characteristic.SecuritySystemTargetState.STAY_ARM:
        this.impulse(this.pinUnsetZoneA);
        break;
      case Characteristic.SecuritySystemTargetState.DISARM:
        break;
      case Characteristic.SecuritySystemTargetState.ALARM_TRIGGERED:
      case Characteristic.SecuritySystemTargetState.AWAY_ARM:
        this.impulse(this.pinUnsetZoneA);
        setTimeout(function () {}, this.timeoutinMs);
        this.impulse(this.pinUnSetZoneB);
        break;

    }
  },

  identify: function(callback){
	console.log("Identify requested!");
	callback();
},


  getServices: function(callback){
    return [this.informationService, this.service];
  }
}
