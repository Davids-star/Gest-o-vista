package br.com.gp.totem;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.hoho.android.usbserial.driver.UsbSerialDriver;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.driver.UsbSerialProber;
import com.hoho.android.usbserial.util.SerialInputOutputManager;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Sensor por cabo USB (OTG): Arduino ligado direto no tablet.
 * Mesma ideia do Bluetooth: o app só recebe texto. Eventos para o JS:
 *   data     { data: "COUNT:7\r\n" }   pedaço de texto recebido (o JS separa as linhas)
 *   error    { message }               leitura falhou (cabo solto)
 *   detached {}                        o cabo foi retirado
 * Métodos: connect({ baudRate }), write({ data }), disconnect().
 * Usa a biblioteca usb-serial-for-android (FTDI, CH340, CP210x, PL2303 e CDC/Arduino original).
 */
@CapacitorPlugin(name = "UsbSerial")
public class UsbSerialPlugin extends Plugin {
    private static final String ACTION_USB_PERMISSION = "br.com.gp.totem.USB_PERMISSION";

    private UsbManager usbManager;
    private UsbSerialPort port;
    private SerialInputOutputManager ioManager;

    private final BroadcastReceiver detachReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(intent.getAction())) {
                closePort();
                notifyListeners("detached", new JSObject());
            }
        }
    };

    @Override
    public void load() {
        usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        ContextCompat.registerReceiver(
            getContext(),
            detachReceiver,
            new IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED),
            ContextCompat.RECEIVER_NOT_EXPORTED
        );
    }

    @Override
    protected void handleOnDestroy() {
        closePort();
        try {
            getContext().unregisterReceiver(detachReceiver);
        } catch (IllegalArgumentException ignored) {
            // já removido
        }
    }

    @PluginMethod
    public void connect(final PluginCall call) {
        final int baudRate = call.getInt("baudRate", 9600);
        closePort();

        List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager);
        if (drivers.isEmpty()) {
            call.reject("Nenhum dispositivo USB serial encontrado");
            return;
        }
        final UsbSerialDriver driver = drivers.get(0);
        final UsbDevice device = driver.getDevice();

        if (usbManager.hasPermission(device)) {
            abrir(call, driver, baudRate);
            return;
        }

        // Pede permissão ao usuário (janela do Android) e abre quando for concedida.
        BroadcastReceiver permissionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                context.unregisterReceiver(this);
                if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                    abrir(call, driver, baudRate);
                } else {
                    call.reject("Permissão de USB negada");
                }
            }
        };
        ContextCompat.registerReceiver(
            getContext(),
            permissionReceiver,
            new IntentFilter(ACTION_USB_PERMISSION),
            ContextCompat.RECEIVER_NOT_EXPORTED
        );
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0;
        Intent intent = new Intent(ACTION_USB_PERMISSION).setPackage(getContext().getPackageName());
        usbManager.requestPermission(device, PendingIntent.getBroadcast(getContext(), 0, intent, flags));
    }

    private void abrir(PluginCall call, UsbSerialDriver driver, int baudRate) {
        try {
            UsbDeviceConnection connection = usbManager.openDevice(driver.getDevice());
            if (connection == null) {
                call.reject("Não foi possível abrir o dispositivo USB");
                return;
            }
            port = driver.getPorts().get(0);
            port.open(connection);
            port.setParameters(baudRate, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            try {
                port.setDTR(true);
                port.setRTS(true);
            } catch (Exception ignored) {
                // nem todo chip aceita; o Arduino funciona assim mesmo
            }
            ioManager = new SerialInputOutputManager(port, new SerialInputOutputManager.Listener() {
                @Override
                public void onNewData(byte[] data) {
                    JSObject out = new JSObject();
                    out.put("data", new String(data, StandardCharsets.UTF_8));
                    notifyListeners("data", out);
                }

                @Override
                public void onRunError(Exception e) {
                    JSObject out = new JSObject();
                    out.put("message", String.valueOf(e.getMessage()));
                    notifyListeners("error", out);
                    closePort();
                }
            });
            ioManager.start();
            call.resolve();
        } catch (Exception e) {
            closePort();
            call.reject("Falha ao abrir a porta USB: " + e.getMessage());
        }
    }

    @PluginMethod
    public void write(PluginCall call) {
        String data = call.getString("data", "");
        if (port == null) {
            call.reject("USB não conectado");
            return;
        }
        try {
            port.write(data.getBytes(StandardCharsets.UTF_8), 1000);
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao escrever na USB: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        closePort();
        call.resolve();
    }

    private void closePort() {
        if (ioManager != null) {
            ioManager.stop();
            ioManager = null;
        }
        if (port != null) {
            try {
                port.close();
            } catch (Exception ignored) {
                // já fechada
            }
            port = null;
        }
    }
}
