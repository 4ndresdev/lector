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
  ToastAndroid,
  Alert,
  SafeAreaView,
  ScrollView
} from "react-native";
import { Icon, Image, Button, Badge } from "react-native-elements";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { BarCodeScanner } from "expo-barcode-scanner";
import * as SQLite from "expo-sqlite";
import * as Network from "expo-network";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import "moment/min/locales";
moment.locale("es");

const db = SQLite.openDatabase("acreditaciones.db");

const Home = ({ navigation }) => {
  const [text, setText] = useState("");
  const [alerta, setAlerta] = useState(false);
  const [updated, setUpdated] = useState(true);
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
        if ((await AsyncStorage.getItem("fecha")) == null) {
          /**
           * Si por alguna razon se borra la variable fecha, restablecemos todo los
           * datos
           */

          db.transaction(tx => {
            tx.executeSql("drop table items", [], (tx, results) => {
              //Alert.alert("table delected");
            });
          });

          db.transaction(tx => {
            tx.executeSql(
              "CREATE TABLE IF NOT EXISTS items(nombre TEXT, placa TEXT, vigencia TEXT, folio_expediente TEXT, descripcion TEXT)",
              null,
              (tx, results) => {
                //Alert.alert("table created");
              }
            );
          });
        }

        //Obtenemos la información
        await axios({
          method: "post",
          url: "https://7819c4cbb689.ngrok.io/api/acreditaciones/get_all",
          data: {
            fecha:
              (await AsyncStorage.getItem("fecha")) == null
                ? ""
                : await AsyncStorage.getItem("fecha")
          },
          headers: {
            "Cache-Control": "no-cache",
            "Cache-Control": "no-transform",
            "Cache-Control": "no-store"
          }
        })
          .catch(function(error) {
            ToastAndroid.show(
              "Ocurrió un problema al obtener los datos",
              ToastAndroid.SHORT
            );
            return;
          })
          .then(async function(response) {
            let now = "";

            if (Object.keys(response.data).length > 0) {              

              //Recorremos el json
              response.data.forEach(element => {
                if (element.nuevo == 1) {
                  db.transaction(tx => {
                    tx.executeSql(
                      "INSERT INTO items(nombre, placa, vigencia, folio_expediente, descripcion) values (?, ?, ?, ?, ?)",
                      [
                        element.nombre,
                        element.placa,
                        element.vigencia,
                        element.folio_expediente,
                        element.descripcion
                      ],
                      (tx, results) => {
                        // console.log("Insert placa 1: " + results.rowsAffected);
                      }
                    );
                  });
                } else if (element.nuevo == 2) {
                  db.transaction(tx => {
                    tx.executeSql(
                      "UPDATE items set nombre = ?, placa = ?, vigencia = ?, folio_expediente = ?, descripcion = ? where placa = ?) values (?, ?, ?, ?, ?, ?)",
                      [
                        element.nombre,
                        element.placa,
                        element.vigencia,
                        element.folio_expediente,
                        element.descripcion,
                        element.placa
                      ],
                      (tx, results) => {}
                    );
                  });
                }

                now = element.fecha_registro;
              });

              //Quitamos la alerta
              setAlerta(false);
              await AsyncStorage.setItem("fecha", now);
              ToastAndroid.show(
                "Datos sincronizados correctamente",
                ToastAndroid.SHORT
              );
            } else {
              setAlerta(false);
              /*
              ToastAndroid.show(
                "Sin datos para sincronizar",
                ToastAndroid.SHORT
              );
              */
            }
          });
      } catch (error) {
        console.error(error);
        setAlerta(false);
      }
    } else {
      ToastAndroid.show("Sin conexión a internet", ToastAndroid.SHORT);
      setAlerta(false);
    }
  };

  const get_data = async () => {
    update();

    db.transaction(tx => {
      tx.executeSql(
        "select * from items where placa = ?",
        [text.trim()],
        (tx, results) => {
          if (results.rows._array.length > 0) {
            setText(""); //Limpiamos el input

            var datos = {
              nombre: results.rows.item(0).nombre,
              vigencia: results.rows.item(0).vigencia,
              folio: results.rows.item(0).folio_expediente,
              placa: results.rows.item(0).placa,
              descripcion: results.rows.item(0).descripcion
            };

            navigation.navigate("Detail", {
              data: datos
            });
          } else {
            ToastAndroid.show(
              "No se encontraron resultados",
              ToastAndroid.SHORT
            );
          }
        }
      );
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
            value={text}
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

    conexion();
  });

  const update = async () => {
    if (conected) {
      try {
        if ((await AsyncStorage.getItem("fecha")) == null) {
          /**
           * Si por alguna razon se borra la variable fecha, restablecemos todo los
           * datos
           */

          db.transaction(tx => {
            tx.executeSql("drop table items", [], (tx, results) => {
              //Alert.alert("table delected");
            });
          });

          db.transaction(tx => {
            tx.executeSql(
              "CREATE TABLE IF NOT EXISTS items(nombre TEXT, placa TEXT, vigencia TEXT, folio_expediente TEXT, descripcion TEXT)",
              null,
              (tx, results) => {
                //Alert.alert("table created");
              }
            );
          });
        }

        //Obtenemos la información
        await axios({
          method: "post",
          url: "https://7819c4cbb689.ngrok.io/api/acreditaciones/get_all",
          data: {
            fecha:
              (await AsyncStorage.getItem("fecha")) == null
                ? ""
                : await AsyncStorage.getItem("fecha")
          },
          headers: {
            "Cache-Control": "no-cache",
            "Cache-Control": "no-transform",
            "Cache-Control": "no-store"
          }
        })
          .catch(function(error) {
            ToastAndroid.show(
              "Ocurrió un problema al obtener los datos",
              ToastAndroid.SHORT
            );
            return;
          })
          .then(async function(response) {
            let now = "";

            if (Object.keys(response.data).length > 0) {
              ToastAndroid.show("Actualizando datos", ToastAndroid.SHORT);

              //Recorremos el json
              response.data.forEach(element => {
                if (element.nuevo == 1) {
                  db.transaction(tx => {
                    tx.executeSql(
                      "INSERT INTO items(nombre, placa, vigencia, folio_expediente, descripcion) values (?, ?, ?, ?, ?)",
                      [
                        element.nombre,
                        element.placa,
                        element.vigencia,
                        element.folio_expediente,
                        element.descripcion
                      ],
                      (tx, results) => {
                        // console.log("Insert placa 1: " + results.rowsAffected);
                      }
                    );
                  });
                } else if (element.nuevo == 2) {
                  db.transaction(tx => {
                    tx.executeSql(
                      "UPDATE items set nombre = ?, placa = ?, vigencia = ?, folio_expediente = ?, descripcion = ? where placa = ?) values (?, ?, ?, ?, ?, ?)",
                      [
                        element.nombre,
                        element.placa,
                        element.vigencia,
                        element.folio_expediente,
                        element.descripcion,
                        element.placa
                      ],
                      (tx, results) => {}
                    );
                  });
                }

                now = element.fecha_registro;
              });

              await AsyncStorage.setItem("fecha", now);
              ToastAndroid.show(
                "Datos sincronizados correctamente",
                ToastAndroid.SHORT
              );
            } else {
              /*
              ToastAndroid.show(
                "Sin datos para sincronizar",
                ToastAndroid.SHORT
              );
              */
            }
          });
      } catch (error) {
        console.error(error);
      }
    } else {
      ToastAndroid.show("Sin conexión a internet", ToastAndroid.SHORT);
    }
  };

  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(false);
    update();
    db.transaction(tx => {
      tx.executeSql(
        "select * from items where placa = ?",
        [data],
        (tx, results) => {
          if (results.rows._array.length > 0) {
            var datos = {
              nombre: results.rows.item(0).nombre,
              vigencia: results.rows.item(0).vigencia,
              folio: results.rows.item(0).folio_expediente,
              placa: results.rows.item(0).placa,
              descripcion: results.rows.item(0).descripcion
            };

            navigation.navigate("Detail", {
              data: datos
            });
          } else {
            ToastAndroid.show(
              "No se encontraron resultados",
              ToastAndroid.SHORT
            );
            navigation.navigate("Reader");
          }
        }
      );
    });
  };

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text> Necesita dar permisos para continuar </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
  const { nombre, vigencia, folio, placa, descripcion } = route.params.data;

  console.log(route.params);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <View style={styles.detailContainer}>
          <View style={styles.placa}>
            <View style={styles.negro}>
              <View style={styles.blanco}>
                <View style={styles.cuadrolLeftTop}></View>
                <View style={styles.cuadrolRightTop}></View>
                <View style={styles.cuadrolRightBottom}></View>
                <View style={styles.cuadrolLeftBottom}></View>
                <Text style={styles.txtplaca}>{placa}</Text>
              </View>
            </View>
          </View>
          <View style={{ width: "80%", marginTop: 20 }}>
            <Text style={{ fontSize: 20, textAlign: "center" }}>{nombre}</Text>
          </View>
          <View style={{ width: "80%", marginTop: 10 }}>
            <Badge
              value={
                moment(new Date()).format("YYYY-MM-DD") >
                moment(vigencia).format("YYYY-MM-DD")
                  ? "No vigente"
                  : "Vigente"
              }
              status={
                moment(new Date()).format("YYYY-MM-DD") >
                moment(vigencia).format("YYYY-MM-DD")
                  ? "warning"
                  : "success"
              }
            />
          </View>
          <View style={{ marginTop: 30 }}></View>
          <View style={{ width: "90%" }}>
            <View style={styles.carta}>
              <Icon name="folder" type="font-awesome" />
              <Text style={{ marginLeft: 10 }}>Folio: {folio}</Text>
            </View>
          </View>
          <View style={{ width: "90%", marginTop: 15 }}>
            <View style={styles.carta}>
              <Icon name="address-card" type="font-awesome" />
              <Text style={{ marginLeft: 10 }}>{descripcion}</Text>
            </View>
          </View>
          <View style={{ width: "90%", marginTop: 15 }}>
            <View style={styles.carta}>
              <Icon name="hourglass-end" type="font-awesome" />
              <Text style={{ marginLeft: 10 }}>
                Vigencia: {moment(vigencia).format("LL")}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  },
  detailContainer: {
    flex: 1,
    padding: 30,
    flexDirection: "column",
    alignItems: "center"
  },
  placa: {
    width: "80%",
    height: 150,
    backgroundColor: "#f6c065",
    marginTop: 30,
    padding: 15,
    borderRadius: 5
  },
  negro: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
    padding: 15
  },
  blanco: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center"
  },
  cuadrolLeftTop: {
    width: 10,
    height: 10,
    backgroundColor: "#000000",
    margin: 10,
    position: "absolute",
    left: 0,
    top: 0
  },
  cuadrolRightTop: {
    width: 10,
    height: 10,
    backgroundColor: "#000000",
    margin: 10,
    position: "absolute",
    right: 0,
    top: 0
  },
  cuadrolRightBottom: {
    width: 10,
    height: 10,
    backgroundColor: "#000000",
    margin: 10,
    position: "absolute",
    right: 0,
    bottom: 0
  },
  cuadrolLeftBottom: {
    width: 10,
    height: 10,
    backgroundColor: "#000000",
    margin: 10,
    position: "absolute",
    left: 0,
    bottom: 0
  },
  txtplaca: {
    fontSize: 25,
    fontWeight: "bold"
  },
  carta: {
    width: "100%",
    padding: 15,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    borderColor: "#e8e8e8",
    borderWidth: 1
  }
});
