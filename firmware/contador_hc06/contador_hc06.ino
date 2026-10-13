#include <SoftwareSerial.h>

// Bluetooth HC-06
const int BT_RX = 3;
const int BT_TX = 4;
SoftwareSerial bluetooth(BT_RX, BT_TX);

// Sensor ultrassonico HC-SR04
const int TRIG_PIN = 9;
const int ECHO_PIN = 10;

// Buzzer
const int BUZZER_PIN = 8;

// Parametros de deteccao
const float DISTANCIA_DETECCAO = 4.0;
const float DISTANCIA_LIBERACAO = 6.0;

const unsigned long INTERVALO_CONTAGEM = 300;
const unsigned long TEMPO_LIMITE_ECO = 30000;

const unsigned long TEMPO_LIVRE = 120;  // ms livre, seguidos, para contar a proxima peca

unsigned long quantidade = 0;
unsigned long ultimaContagem = 0;
unsigned long livreDesde = 0;
bool emLivre = false;
bool sensorLiberado = true;

float medirDistancia() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duracao =
      pulseIn(ECHO_PIN, HIGH, TEMPO_LIMITE_ECO);

  if (duracao == 0) {
    return -1;
  }

  return duracao * 0.0343 / 2.0;
}

void enviarMensagem(String mensagem) {
  Serial.println(mensagem);
  bluetooth.println(mensagem);
}

void contarDoce() {
  quantidade++;
  ultimaContagem = millis();

  enviarMensagem("COUNT:" + String(quantidade));

  tone(BUZZER_PIN, 1000, 150);
}

void processarComando(Stream &canal) {
  if (canal.available() == 0) {
    return;
  }

  String comando = canal.readStringUntil('\n');
  comando.trim();
  comando.toUpperCase();

  if (comando == "RESET") {
    quantidade = 0;
    sensorLiberado = true;

    enviarMensagem("COUNT:0");
    enviarMensagem("OK:RESET");
  }
  else if (comando == "STATUS") {
    enviarMensagem("COUNT:" + String(quantidade));
  }
  else if (comando == "CALIBRAR") {
    enviarMensagem("DISTANCIA_DETECCAO:4.0");
    enviarMensagem("DISTANCIA_LIBERACAO:6.0");
    enviarMensagem("OK:CALIBRAR");
  }
  else if (comando == "HELP") {
    enviarMensagem(
      "COMANDOS:RESET,STATUS,CALIBRAR,HELP"
    );
  }
  else if (comando.length() > 0) {
    enviarMensagem("ERRO:COMANDO_INVALIDO");
  }
}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(TRIG_PIN, LOW);

  Serial.begin(9600);
  bluetooth.begin(9600);

  Serial.setTimeout(50);
  bluetooth.setTimeout(50);

  delay(500);

  enviarMensagem("ScoreFlow Arduino iniciado");
  enviarMensagem("COUNT:0");
  enviarMensagem("HELP para ver os comandos");
}

void loop() {
  processarComando(Serial);
  processarComando(bluetooth);

  float distancia = medirDistancia();
  unsigned long agora = millis();

  // "Livre" = nada perto (acima da liberacao) ou sem eco. So libera para contar de novo depois
  // de ficar livre por TEMPO_LIVRE seguidos: uma peca parada na frente que falha o eco de vez
  // em quando (-1) nao libera o sensor e nao e contada de novo.
  bool livre = (distancia < 0 || distancia > DISTANCIA_LIBERACAO);
  if (livre) {
    if (!emLivre) {
      emLivre = true;
      livreDesde = agora;
    }
    if (agora - livreDesde >= TEMPO_LIVRE) sensorLiberado = true;
  } else {
    emLivre = false;  // ainda tem algo na frente
  }

  if (distancia > 0 &&
      distancia <= DISTANCIA_DETECCAO &&
      sensorLiberado &&
      agora - ultimaContagem >= INTERVALO_CONTAGEM) {

    contarDoce();
    sensorLiberado = false;
  }
}
