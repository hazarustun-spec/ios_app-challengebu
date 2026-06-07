import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { TextField } from '../ui/TextField';
import { type PlayerRow, usePlayers } from '../../hooks/use-players';

interface Props {
  selectedId: string | undefined;
  onSelect: (player: PlayerRow) => void;
  genderFilter?: 'erkek' | 'kadin' | 'open_only';
}

export function PlayerPicker({ selectedId, onSelect, genderFilter }: Props) {
  const { data: players, isLoading } = usePlayers({ gender: genderFilter });
  const [search, setSearch] = useState('');

  const filtered = (players ?? []).filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase().trim()),
  );

  if (isLoading) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator color="#1e3a8a" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <TextField
        label="Oyuncu ara"
        placeholder="İsim veya soyisim"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => {
          const isSelected = item.user_id === selectedId;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              className={`mb-1 flex-row items-center rounded-lg border p-3 ${
                isSelected ? 'border-primary bg-blue-50' : 'border-gray-300 bg-white'
              }`}
            >
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                  isSelected ? 'border-primary' : 'border-gray-400'
                }`}
              >
                {isSelected && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </View>
              <Text className="text-base text-gray-900">
                {item.first_name} {item.last_name}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text className="py-6 text-center text-gray-500">Oyuncu bulunamadı</Text>
        }
      />
    </View>
  );
}
