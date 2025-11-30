import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/MapConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const initSocket = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      
      const newSocket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    };

    initSocket();
  }, []);

  return socket;
};

