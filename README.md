# homebridge-alarmpi
**exposes the GPIO of a raspberry PI to control a Jablotron Alarm system**

It uses an electronical wiring,a relay and a raspberry PI to get the state of an Jablotron Oasis 80 alarm system and also sets the state.

The Jablotron system I'm using is in Splitted mode which means that Zone A is for the perimeter and Zone B for the inhouse motion sensors. While at home Zone A is active, when on the go Zone B (+ Zone A) is active and it shows as ABC on the control panel, perimeter + inhouse motion sensors are active.

## Configuration the Jablotron System

Firstly the alarm system has be brought into service mode by entering * 0 <Service code> it will change it's mode. The default code is 8080 and pressing ESC you can leave the service mode.

### Read the State (spilt system): 

Enter 234 to set PG X to ON when Zone A is armed.
Enter 244 to set PG Y to ON when Zone B is armed.
a more detailed description can be found in the [Oasis user manual](https://www.jablotron.com/en/about-jablotron/downloads/?filename=ja-80-oasis-user_en_mke22103.pdf&do=downloadFile/).


### Set the state:

Either use the remote control and solder inputs from Raspberry Pi to the buttons you can choose different GPIOs in the config.json file for Set and Unset for each Zone or use the Olink Software and a JA-82T USB connection to change the two inputs to set/unset Zone A and Zone B.
When the wires are directly connected to the alarm system be aware to use 1 k Ohm resistors to avoid tamper. 
In my configuration I have port 5 on the alarm system connected with 1 k Ohm to the COM port and a wire from port 5 and one from Ground to a relay. Port 5 is configured to set/unset Zone A.
On the Relay I use NC (normally closed) and also have 1 k Ohm resistor btw the two wires from the alarm system. A 1 sec impulse switches the state btw set/unset. The same applies for Zone B but with a different port on the alarm system and a different relay.

## Configuration of wiring and Raspberry PI

With the help of my brother in law I created a wiring which takes the outputs from the alarm system routes it through an opto-coupler to pass the signals from the alarm system to Raspberry PI GPIOs.
For this the PG X/PG Y, active alarm and VCC is linked into the opto-coupler on the other side ground and read pins for the state an ground are linked to the GPIOs.
According to the vendor documentation PG X and PG Y are potential free, but for EW output I don't know.

## Installation
`npm install -g homebridge-alarmpi`


### Thanks to

- @my brother in law
- @homebridge-gpio-device
- @homebridge-alarmdotcom




