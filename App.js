import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ToastAndroid
} from "react-native";
import { Icon, Image, Button } from "react-native-elements";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { BarCodeScanner } from "expo-barcode-scanner";
import * as SQLite from "expo-sqlite";
import * as Network from "expo-network";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const db = SQLite.openDatabase("acreditaciones.db");

const Home = ({ navigation }) => {
  const [text, setText] = useState("");
  const [alerta, setAlerta] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [conected, setConected] = useState(false);

  useEffect(() => {
    const conexion = async () => {
      const conexion = await Network.getNetworkStateAsync();
      if (conexion.isInternetReachable && conexion.isConnected) {
        setConected(true);
      } else {
        setConected(false);
      }
    };

    const fecha = async () => {
      if ((await AsyncStorage.getItem("fecha")) == null) {
        setUpdated(false);
      } else {
        setUpdated(true);
      }
    };

    conexion();
    fecha();
  });

  const update = async () => {
    setAlerta(true);

    if (conected) {
      try {
        //Creamos la tabla si no existe
        db.transaction(tx => {
          tx.executeSql(
            "CREATE TABLE IF NOT EXISTS solicitudes (nombre TEXT, placa TEXT, vigencia TEXT, folio_expediente TEXT, estatus TEXT, descripcion TEXT)"
          );
        });

        //Obtenemos la información
        const response = await axios.post(
          "https://c9f0a190025e.ngrok.io/api/acreditaciones/get_all",
          {
            fecha: await AsyncStorage.getItem("fecha")
          }
        );

        let now = "";

        if (Object.keys(response.data).length > 0) {
          //Recorremos el json
          await response.data.forEach(element => {
            if (element.nuevo == 1) {
              db.transaction(tx => {
                tx.executeSql(
                  "INSERT INTO solicitudes (nombre, placa, vigencia, folio_expediente, estatus, descripcion) values (?, ?, ?, ?, ?, ?)",
                  [
                    element.nombre,
                    element.placa,
                    element.vigencia,
                    element.folio_expediente,
                    element.estatus,
                    element.descripcion
                  ],
                  (tx, results) => {
                    /*
                  if (results.rowsAffected == 0) {
                    ToastAndroid.show(
                      `Error al descargar el registro ${element.id_acreditacion}`,
                      ToastAndroid.SHORT
                    );
                  }
                  */
                  }
                );
              });

              if (element.placa2 != null) {
                db.transaction(tx => {
                  tx.executeSql(
                    "INSERT INTO solicitudes (nombre, placa, vigencia, folio_expediente, estatus, descripcion) values (?, ?, ?, ?, ?, ?)",
                    [
                      element.nombre,
                      element.placa2,
                      element.vigencia,
                      element.folio_expediente,
                      element.estatus,
                      element.descripcion
                    ],
                    (tx, results) => {}
                  );
                });
              }

              if (element.placa3 != null) {
                db.transaction(tx => {
                  tx.executeSql(
                    "INSERT INTO solicitudes (nombre, placa, vigencia, folio_expediente, estatus, descripcion) values (?, ?, ?, ?, ?, ?)",
                    [
                      element.nombre,
                      element.placa3,
                      element.vigencia,
                      element.folio_expediente,
                      element.estatus,
                      element.descripcion
                    ],
                    (tx, results) => {}
                  );
                });
              }
            } else if (element.nuevo == 2) {
              db.transaction(tx => {
                tx.executeSql(
                  "UPDATE solicitudes set nombre = ?, placa = ?, vigencia = ?, folio_expediente = ?, estatus = ?, descripcion = ? where placa = ?) values (?, ?, ?, ?, ?, ?, ?)",
                  [
                    element.nombre,
                    element.placa,
                    element.vigencia,
                    element.folio_expediente,
                    element.estatus,
                    element.descripcion,
                    element.placa
                  ],
                  (tx, results) => {}
                );
              });

              if (element.placa2 != null) {
                db.transaction(tx => {
                  tx.executeSql(
                    "UPDATE solicitudes set nombre = ?, placa = ?, vigencia = ?, folio_expediente = ?, estatus = ?, descripcion = ? where placa2 = ?) values (?, ?, ?, ?, ?, ?, ?)",
                    [
                      element.nombre,
                      element.placa2,
                      element.vigencia,
                      element.folio_expediente,
                      element.estatus,
                      element.descripcion,
                      element.placa2
                    ],
                    (tx, results) => {}
                  );
                });
              }

              if (element.placa3 != null) {
                db.transaction(tx => {
                  tx.executeSql(
                    "UPDATE solicitudes set nombre = ?, placa = ?, vigencia = ?, folio_expediente = ?, estatus = ?, descripcion = ? where placa3 = ?) values (?, ?, ?, ?, ?, ?, ?)",
                    [
                      element.nombre,
                      element.placa3,
                      element.vigencia,
                      element.folio_expediente,
                      element.estatus,
                      element.descripcion,
                      element.placa3
                    ],
                    (tx, results) => {}
                  );
                });
              }
            }

            now = element.fecha_registro;
          });

          //Quitamos la alerta
          setAlerta(false);
          AsyncStorage.setItem("fecha", now);
        } else {
          ToastAndroid.show("Nada para actualizar", ToastAndroid.SHORT);
          setAlerta(false);
        }
      } catch (error) {
        console.error(error);
        setAlerta(false);
      }
    } else {
      ToastAndroid.show("Sin conexion a internet", ToastAndroid.SHORT);
    }
  };

  const get_data = async () => {
    update();

    db.transaction(tx => {
      tx.executeSql("select count(*) from solicitudes", [], (tx, results) => {
        console.log(results.rows._array);
        alerta(results.rows._array);
      });
    });
  };

  return (
    <View style={styles.container}>
      {updated ? (
        <View
          style={{
            width: "90%",
            flexDirection: "row",
            justifyContent: "center"
          }}
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
      ) : (
        <View style={styles.updatedContainer}>
          <Image
            source={require("./assets/codigo.png")}
            style={{ width: 200, height: 200 }}
          />
          <Text style={{ textAlign: "center", marginTop: 30 }}>
            {" "}
            Antes de continuar, es importante {"\n"} descargar la base{" "}
          </Text>
          <Button
            onPress={update}
            title="Descargar base"
            loading={alerta ? true : null}
            disabled={alerta ? true : null}
            containerStyle={{ marginTop: 20 }}
            buttonStyle={{ backgroundColor: "#000000", padding: 15 }}
          />
        </View>
      )}
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
  },
  updatedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }
});
