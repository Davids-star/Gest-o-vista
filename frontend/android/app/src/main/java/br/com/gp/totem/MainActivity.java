package br.com.gp.totem;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UsbSerialPlugin.class); // sensor por cabo USB (OTG)
        super.onCreate(savedInstanceState);
    }
}
