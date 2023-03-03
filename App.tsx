import React, { useEffect, useState } from 'react';
import { View, StyleSheet,  } from 'react-native';
import { Appbar, Text, Button, IconButton, BottomNavigation } from 'react-native-paper';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import ottoData from './automaatit.json'

interface Ottotyypit {
  katuosoite : string
  postinumero : string
  postitoimipaikka : string
  koordinaatti_LAT : number
  koordinaatti_LON : number
  etaisyys? : number
}

const App : React.FC = () : React.ReactElement => {
  // QR-SELAIN ->   -----------------------------------------------------------------------------
  const [skanneri, setSkanneri] = useState<boolean>(false);  
  const [lupa, setLupa] = useState<any>(null);
  const [skannattu, setSkannattu] = useState<boolean>(false);
  const [webView, setWebView] = useState<boolean>(false);  
  const [url, setUrl] = useState<string>("");  

  // Käynnistetään skanneri (käyttöliittymässä oma nappi joka ajaa tämän), tarkastetaan ja pyydetään luvat.
  const kaynnistaSkanneri = async () : Promise<void> => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setLupa(status === 'granted');
    };
    getBarCodeScannerPermissions();
  };

  const barcodeKasittelija = ({ data }: { data: string }) => {
    setSkannattu(true); 
    setUrl(data) // Skannatusta QR-koodista saatu verkko-osoite asetetaan "url" -tilaksi
    urlCheck(data); // Lähetetään verkko-osoite tarkastettavaksi urlCheck -funktiolle
  };
  // Tarkastetaan, että verkko-osoite alkaa http:// tai https://
  const urlCheck = (string : string) => {
    let http = string.startsWith("http://")
    let https = string.startsWith("https://")
    if(http === true || https === true ){
      setWebView(true); // JOS url = ok -> asetetaan WebView-tila => true, jolloin käyttöliittymään renderöidään verkkosivu näkyviin.
    } else { // JOS chekki ei mene läpi -> ei tehdä mitään (pidetään webview ja skannattu tilat falsena)
      setWebView(false);
      setSkannattu(false);
    }
  };
  // AppBarissa sijaitsevan WebView näkymän sulkemiseen käytettävä funktio (käyttöliittymässä IconButtonin onPress)
  const suljeWeb = () => {
      setWebView(false);
      setTimeout(() => { // Lisätty 2s timeout jottei kamera nappaa samaa QR-koodia välittömästi.
        setSkannattu(false);
    }, 2000);  
  };

  // QR-SELAIN ROUTE (Käyttöliittymä) -----------------------------------------------------------------------------
  const QrSelainRoute = () => 
    <SafeAreaProvider style={styles.bg}>
    
    <Appbar.Header style={styles.appBar}>
      <Appbar.Content color={'#1a1a1a'} title="QR-Selain" />

      {/* WebView sulkemispainike (näytetään vain WebView:n ollessa aktiivisena) */}
      {(Boolean(webView))
      ? <IconButton 
          icon="close"
          iconColor='#1a1a1a'
          size={40}
          onPress={suljeWeb}
        />
      : null
      }

    </Appbar.Header>
    {/* JOS "skanneri" = true => Näytetään WebView TAI BarCodeScanner riippuen siitä onko WebView = true. 
        JOS "skanneri" = false => Näytetään camera-off ikoni */}
    {(Boolean(skanneri))
    ? <>
        {(Boolean(webView))
        ? <WebView
            style={styles.container}
            source={{ uri: `${url}` }} // Verkko-osoite johon WebView siirtyy.
          />
        : <SafeAreaProvider>
              <View style={styles.container}>
                    <BarCodeScanner
                      onBarCodeScanned={skannattu ? undefined : barcodeKasittelija}
                      style={styles.skanneri}
                    />
                    <Text style={styles.ohjeteksti}>Osoita kamera QR-koodia kohti</Text>                       
              </View>
          </SafeAreaProvider>
        }
      </>
    : <View style={styles.container}>

        <IconButton
          icon="qrcode"
          size={230}
          iconColor={'#c7deed'}
          style={styles.taustaIkoni}
        />

        <Text>Skanna uusi QR-koodi katsellaksesi verkkosivua</Text>

      </View>
    }
    {/* JOS WebView = true => pysyy nappulat piilossa. JOS WebView = false => näytetään JOKO 
          "Sulje Skanneri" -nappi 
          TAI 
          "Käynnistä Skanneri" -nappi 
        riippuen siitä onko skanneri true/false */}
    {(Boolean(webView))
    ? null
    : <>
        {(Boolean(skanneri))
        ? <Button 
            icon="close-thick"
            mode="contained" 
            style={styles.nappi}
            onPress={ () => setSkanneri(false)}>
            Sulje Skanneri
          </Button>
        : <Button 
            icon="qrcode-scan" 
            mode="contained" 
            style={styles.nappi}
            onPress={ () => setSkanneri(true)}>
            Käynnistä Skanneri
          </Button>
        } 
      </>
    }
    {/* Koska AppBar tausta valkoinen niin statusbar tumma */}
    <StatusBar style="dark" /> 

    </SafeAreaProvider>

  // OTTO-AUTOMAATIN PAIKANNUS ->  -----------------------------------------------------------------------------
  const [location, setLocation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<any>(null);
  const [lahinOttoString, setLahinOttoString] = useState<string>("");

  // Otto automaattien JSON omalla interfacella
  const data : Ottotyypit[] = ottoData

  // Funktio jolla lasketaan kahden pisteen välinen etäisyys koordinaatistossa
  const getDistance = (lat1 : number, lon1 : number, lat2 : number, lon2 : number) => {

      let dLat = (lat2 - lat1) * Math.PI / 180.0;
      let dLon = (lon2 - lon1) * Math.PI / 180.0;
        
      lat1 = (lat1) * Math.PI / 180.0;
      lat2 = (lat2) * Math.PI / 180.0;
      
      let a = Math.pow(Math.sin(dLat / 2), 2) +
                Math.pow(Math.sin(dLon / 2), 2) *
                Math.cos(lat1) *
                Math.cos(lat2);
      let rad = 6371;
      let c = 2 * Math.asin(Math.sqrt(a));
      return rad * c;
  }
  // Käydään data (automaatit.json) läpi ja lisätään laskettu etäisyys uutena tietona jokaiselle Otto-automaatille.
  const lisaaEtaisyys = () => {
    for(let i = 0; i < data.length; i++) {
    let etaisyys = getDistance(location.coords.latitude, location.coords.longitude, data[i].koordinaatti_LAT, data[i].koordinaatti_LON); 
                  data[i].etaisyys = etaisyys;
    } 
    // Järjestetään Otto-automaatit etäisyyden perusteella pienimmästä suurimpaan.
    data.sort(function(a, b) {
      return a.etaisyys! - b.etaisyys!;
    })
    // Asetetaan "lahinOttoString" tilaksi paikassa [0] olevan ottoautomaatin tiedoilla höystetty stringi, joka esitetään käyttöliittymässä.
    setLahinOttoString( data[0].katuosoite + "\n" + 
                        data[0].postinumero + "\n" + 
                        data[0].postitoimipaikka + "\n" + 
                        "Etäisyys: " + data[0].etaisyys!.toFixed(2) + " km")
  };
  // Pyydetään ja tarkastetaan sijainnin -lupatiedot
  useEffect(() => {
    (async () => {
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Paikkatietojen hakuun ei ole annettu lupaa');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  let waiter = 'Odota, sijaintiasi haetaan...';
  if (errorMsg) {
    waiter = errorMsg;
  } 

  // OTTO-AUTOMAATIN PAIKANNUS ROUTE (Käyttöliittymä) ->  -----------------------------------------------------------------------------
  const PaikanninRoute = () =>  
    <SafeAreaProvider style={styles.bg}>

      <Appbar.Header style={styles.appBar}>
        <Appbar.Content color={'#1a1a1a'} title="Otto-automaatti paikannin" />
      </Appbar.Header>

      <View style={styles.container}>

        <IconButton
          icon="piggy-bank-outline"
          size={230}
          iconColor={'#c7deed'}
          style={styles.taustaIkoni}
        />

        {/* JOS "lahinOttoString" sisältää jotain => Näytetään sen sisältö tekstielementtien kautta. 
            JOS "lahinOttoString" on tyhjä => Näytetään painike lähimmän automaatin etsimiseen TAI odotus / virheviesti, riippuen siitä onko location saatu haettua */}
        {Boolean(lahinOttoString)
        ? <>
            <Text>Lähin Otto-automaatti sijaitsee osoitteessa:</Text>
            <Text style={styles.ottoTeksti}>{lahinOttoString}</Text>
          </>
        : <>
            {Boolean(location)
            ? <Button 
                icon="piggy-bank-outline"
                mode="contained"
                style={styles.nappi}
                onPress={lisaaEtaisyys}>
                Etsi lähin Otto-automaatti
              </Button>
            : <Text>{waiter}</Text>
            }
          </>
        }

      </View>

    </SafeAreaProvider>

  // BOTTOMNAVIGATION ->  -----------------------------------------------------------------------------
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'qrSelain', title: 'QR Selain', focusedIcon: 'qrcode-scan', unfocusedIcon: 'qrcode' },
    { key: 'paikannin', title: 'Paikannin', focusedIcon: 'navigation-variant', unfocusedIcon: 'navigation-variant-outline' }
  ]);

  const renderScene = BottomNavigation.SceneMap({
    qrSelain: QrSelainRoute,
    paikannin: PaikanninRoute,
  });

  return (
    <SafeAreaProvider>

      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        barStyle={{ backgroundColor: 'white' }}
        theme={{colors: { secondaryContainer: '#009fd9', onSecondaryContainer: 'white',}}}
      />

    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bg: {
    backgroundColor: '#e1eaf0',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBar: {
    backgroundColor: 'white',
    color: 'black',
  },
  taustaIkoni: {
    position: 'absolute',
    top: 20,
    margin: 20
  },
  nappi: {
    position: 'absolute',
    backgroundColor: '#009fd9',
    borderRadius : 50,
    margin : 20,
    bottom : 0,
    left: 0,
    right: 0
  },
  nappi2: {
    backgroundColor: '#009fd9',
    borderRadius : 50,
    margin : 20,
    left: 0,
    right: 0
  },
  skanneri: {
    backgroundColor: '#4d4c4c',
    borderRadius: 50,
    height: 400,
    width: 400,
    overflow: "hidden",
  },
  ohjeteksti: {
    fontSize: 20,
    margin: 30,
    color: '#1a1a1a',
  },
  ottoTeksti: {
    margin: 30,
    fontSize: 20,
    fontWeight: 'bold'
  }
});

export default App;