import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions
} from "react-native";
import { Icon } from "react-native-elements";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { BarCodeScanner } from "expo-barcode-scanner";
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabase("acreditaciones.db");

const Home = ({ navigation }) => {
  
  const [text, setText] = useState("");
  const [alerta, setAlerta] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        db.transaction(tx => {
          tx.executeSql("DROP TABLE prueba", [], (tx, results) => {
            if (results.rows) {
              console.log("Table deleted");
            }
          });
        });

        db.transaction(tx => {
          tx.executeSql(
            "CREATE TABLE IF NOT EXISTS prueba (id INT, name TEXT, username TEXT, email TEXT)"
          );
        });

        let response = await fetch(
          "https://jsonplaceholder.typicode.com/users"
        );
        let obj = await response.json();

        await obj.forEach(element => {
          let json = {
            id: element.id,
            name: element.name,
            username: element.username,
            email: element.email
          };

          db.transaction(tx => {
            tx.executeSql(
              "INSERT INTO prueba (id, name, username, email) values (?, ?, ?, ?)",
              [element.id, element.name, element.username, element.email],
              (tx, results) => {
                console.log("Results", results.rowsAffected);
              }
            );
          });
        });

        setAlerta(false);
      } catch (error) {
        console.error(error);
        setAlerta(false);
      }
    })();
  });

  const get_data = () => {
    db.transaction(tx => {
      tx.executeSql(
        "select * from prueba where id = ?",
        [text],
        (tx, results) => {
          console.log(results.rows._array);
        }
      );
    });
  };

  return (
    <View style={styles.container}>
      <View
        style={{ width: "90%", flexDirection: "row", justifyContent: "center" }}
      >
        <TextInput
          autoCapitalize={"characters"}
          style={styles.input}
          onChangeText={text => setText(text)}
          placeholder="Placa"
        />
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate("Camera")}
        >
          <Text style={{ color: "white" }}>
            <Icon name="camera-outline" type="ionicon" color="#ffffff" />
          </Text>
        </TouchableOpacity>
      </View>
      {text.length > 0 ? (
        <View style={{ width: "67%" }}>
          <TouchableOpacity onPress={get_data} style={styles.lgBtn}>
            <Text style={{ color: "white", textAlign: "center" }}>Buscar</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {alerta ? (
        <View style={styles.loading}>
          <Text style={{ color: "white" }}>Actualizando contenido...</Text>
        </View>
      ) : null}
      <StatusBar style="auto" />
    </View>
  );
};

const Camera = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(true);

  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(false);

    db.transaction(tx => {
      tx.executeSql(
        "select * from prueba where id = ?",
        [data],
        (tx, results) => {
          console.log(results.rows._array);
        }
      );
    });

    navigation.navigate("Detail", {
      codigo: data
    });
  };

  if (hasPermission === null) {
    return (
      <View>
        <Text> Necesita dar permisos para continuar </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View>
        <Text> Necesita dar permisos para continuar </Text>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? handleBarCodeScanned : undefined}
        style={{
          width: Dimensions.get("screen").width,
          height: Dimensions.get("screen").height,
          transform: [{ translateY: -13 }]
        }}
      />
    </View>
  );
};

const Detail = ({ route }) => {
  const { codigo } = route.params;

  return (
    <View>
      <Text>{codigo}</Text>
    </View>
  );
};

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
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  input: {
    width: "60%",
    backgroundColor: "#f5f4f4",
    padding: 18
  },
  btn: {
    backgroundColor: "#000000",
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  lgBtn: {
    width: "100%",
    backgroundColor: "#000000",
    marginTop: 20,
    padding: 20,
    borderRadius: 5
  },
  loading: {
    width: "100%",
    backgroundColor: "#16c79a",
    position: "absolute",
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 10,
    paddingTop: 10
  }
});
