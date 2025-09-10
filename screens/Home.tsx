import React from 'react';
import { View, Text, Button } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation } : Props ) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Bienvenido a Century21</Text>
      <Button title="Ir a Sala 1" onPress={() => navigation.navigate('Sala', { numero : 1})} />
      <Button title="Ir a Sala 2" onPress={() => navigation.navigate('Sala', { numero : 2})} />
      <Button title="Ir a Sala 3" onPress={() => navigation.navigate('Sala', { numero : 3})} />
      <Button title="Ir a Sala 4" onPress={() => navigation.navigate('Sala', { numero : 4})} />
      <Button title="Ir a Sala 5" onPress={() => navigation.navigate('Sala', { numero : 5})} />
      <Button title="Ir a Sala 6" onPress={() => navigation.navigate('Sala', { numero : 6})} />
      <Button title="Ir a Sala 7" onPress={() => navigation.navigate('Sala', { numero : 7})} />
    </View>
  );
}