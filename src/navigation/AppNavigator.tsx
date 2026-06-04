import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import RuleConfigScreen from '../screens/RuleConfigScreen';
import GameScreen from '../screens/GameScreen';
import PhysicalGameScreen from '../screens/PhysicalGameScreen';
import RevealScreen from '../screens/RevealScreen';
import ResultScreen from '../screens/ResultScreen';
import OnlineLobbyScreen from '../screens/OnlineLobbyScreen';
import OnlineGameScreen from '../screens/OnlineGameScreen';
import OnlineResultScreen from '../screens/OnlineResultScreen';
import TutorialScreen from '../screens/TutorialScreen';
import RulesScreen from '../screens/RulesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { RuleConfig } from '../../packages/game-core/src';
import { useTheme } from '../store/settingsStore';

export type RootStackParamList = {
  Home: undefined;
  RuleConfig: { mode: 'local' | 'physical' };
  Game: { rules: RuleConfig; humanName: string; botCount: number };
  PhysicalGame: undefined;
  Reveal: undefined;
  Result: undefined;
  OnlineLobby: { mode: 'online' | 'physical' };
  OnlineGame: undefined;
  OnlineResult: undefined;
  Tutorial: undefined;
  Rules: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const t = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerStyle: { backgroundColor: t.surface }, headerTintColor: t.text }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RuleConfig" component={RuleConfigScreen} options={{ title: 'Configurar Regras' }} />
        <Stack.Screen name="Game" component={GameScreen} options={{ title: 'Dudos', headerBackVisible: false }} />
        <Stack.Screen name="PhysicalGame" component={PhysicalGameScreen} options={{ title: 'Modo Físico', headerBackVisible: false }} />
        <Stack.Screen name="Reveal" component={RevealScreen} options={{ title: 'Resultado' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Fim de Jogo', headerBackVisible: false }} />
        <Stack.Screen name="OnlineLobby" component={OnlineLobbyScreen} options={{ title: 'Jogar Online' }} />
        <Stack.Screen name="OnlineGame" component={OnlineGameScreen} options={{ title: 'Dudos Online', headerBackVisible: false }} />
        <Stack.Screen name="OnlineResult" component={OnlineResultScreen} options={{ title: 'Fim de Jogo', headerBackVisible: false }} />
        <Stack.Screen name="Tutorial" component={TutorialScreen} options={{ title: 'Tutorial' }} />
        <Stack.Screen name="Rules" component={RulesScreen} options={{ title: 'Regras' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configurações' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
