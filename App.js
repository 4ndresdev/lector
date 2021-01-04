import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import { Icon } from 'react-native-elements'
import { NavigationContainer, useNavigation  } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { BarCodeScanner } from 'expo-barcode-scanner';



const Home = ({ navigation }) => {

  const [text, setText] = useState('');

  return (
    <View style={styles.container}>
      <View style={{width: '90%', flexDirection: 'row', justifyContent: 'center'}}>
        <TextInput
        style={styles.input}
        onChangeText={text => setText(text)}
        placeholder='Código'
        keyboardType='numeric'
        />
        <TouchableOpacity 
          style={styles.btn}
          onPress={() => navigation.navigate('Camera')}
          >
          <Text style={{color: 'white'}}>
          <Icon          
          name='camera-outline' 
          type='ionicon'
          color='#ffffff'
          />
          </Text>
        </TouchableOpacity>
      </View>
      { text > 0 ?
      <View style={{width: '67%'}}>
        <TouchableOpacity style={styles.lgBtn}>
          <Text style={{color: 'white', textAlign: 'center'}}>Buscar</Text>
        </TouchableOpacity>
      </View>
      : null}
      <StatusBar style="auto" />
    </View>
  )
}


const Camera = () => {

  const [hasPermission, setHasPermission] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  

  const handleBarCodeScanned = ({ type, data }) => {    

    navigation.navigate('Detail', {
      codigo: data
    });

  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={handleBarCodeScanned}
        style={{width: '100%', height:'100%'}}
      />
    </View>
  );
}

const Detail = ({route}) => {

  const {codigo} = route.params;

  return (
    <View>
      <Text>{codigo}</Text>
    </View>
  );
}

const Stack = createStackNavigator();

const App = ({ navigation }) => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Reader" component={Home} />
        <Stack.Screen name="Camera" component={Camera} />
        <Stack.Screen name="Detail" component={Detail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',    
  },  
  input:{
      width: '60%',
      backgroundColor: '#f5f4f4',
      padding: 18
  },
  btn:{
    backgroundColor: '#000000',    
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  lgBtn:{    
    width: '100%',    
    backgroundColor: '#000000',
    marginTop: 20,
    padding: 20, 
    borderRadius: 5
  }
});
