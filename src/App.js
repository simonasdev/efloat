import React, { Component } from 'react';
import { StyleSheet, ToastAndroid, Alert } from 'react-native';
import MapView from 'react-native-maps';
import BluetoothSerial from 'react-native-bluetooth-serial';

export default class efloat extends Component {
  constructor (props) {
    super(props)
    this.state = {
      isEnabled: false,
      connected: false,
      device: null,
      caught: false,
      latitude: 54.6872,
      longitude: 25.2797,
      lights: false,
    }
  }

  componentWillMount () {
    Promise.all([
      BluetoothSerial.isEnabled(),
      BluetoothSerial.list()
    ])
    .then((values) => {
      const [ isEnabled, devices ] = values

      devices.forEach(device => {
        if (device.name === 'aFloat') this.connect(device)
      })
      this.setState({ isEnabled })
    })

    BluetoothSerial.on('bluetoothEnabled', () => this.alert('Bluetooth enabled'))
    BluetoothSerial.on('bluetoothDisabled', () => this.alert('Bluetooth disabled'))
    BluetoothSerial.on('error', (err) => this.alert(`Error: ${err.message}`))
    BluetoothSerial.on('connectionLost', () => {
      if (this.state.device) {
        this.alert(`Connection to device ${this.state.device.name} has been lost`)
      }
      this.setState({ connected: false })
    })

    BluetoothSerial.on('data', (message) => this.parseMessage(message.data))
  }

  render() {
    const { latitude, longitude } = this.state

    return (
      <MapView
        style={{flex: 1}}
        region={{
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <MapView.Marker
          coordinate={{ latitude: latitude, longitude: longitude }}
          title={'Pludė'}
          description={'Spausk junginėt lempas'}
          onCalloutPress={this.toggleLights}
        />
      </MapView>
    );
  }

  alert (message) {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }

  write (message) {
    BluetoothSerial.write(message).catch((err) => this.alert(err.message))
  }

  connect (device) {
    BluetoothSerial.connect(device.id)
      .then((res) => {
        this.alert(`Connected to ${device.name}`)
        this.setState({ device, connected: true })

        BluetoothSerial.subscribe("\n")
      })
      .catch((err) => {
        this.alert(err.message)

        setTimeout(() => {
          this.alert('Reconnecting...')
          this.connect(device)
        }, 1000)
      })
  }

  parseMessage (data) {
    console.log(data)
    if (data.indexOf('$STATE') > -1) {
      const caught = data.split(',')[1][0] === '1'

      if (caught !== this.state.caught) {
        this.setState({ caught })

        if (caught) {
          Alert.alert(
            'Fish caught!',
            'Go fetch!',
            [{ text: 'Got it!', onPress: () => this.write('R') }],
            { cancelable: false }
          )
        }
      }
    } else {
      const components = data.split(',')
      const latitude = parseFloat(components[1]) / 100,
            longitude = parseFloat(components[3]) / 100;

      this.setState({ latitude, longitude })
    }
  }

  toggleLights = () => {
    if (this.state.lights) {
      this.write('-')
      this.setState({ lights: false })
    } else {
      this.write('+')
      this.setState({ lights: true })
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});