import { configureStore, createSlice } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import { agentcareStorage } from './storage';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    user: null,
    companies: [],
    selectedCompany: null,
    menu: [],
    locale: 'zh-tw',
    dark: false,
  },
  reducers: {
    setSession(state, action) {
      state.user = action.payload.user;
      state.companies = action.payload.companies || [];
      state.selectedCompany = action.payload.selectedCompany || null;
    },
    setMenu(state, action) {
      state.menu = action.payload || [];
    },
    setLocale(state, action) {
      state.locale = action.payload === 'en' ? 'en' : 'zh-tw';
    },
    setSelectedCompany(state, action) {
      state.selectedCompany = action.payload || null;
    },
    setDark(state, action) {
      state.dark = Boolean(action.payload);
    },
    clearSession(state) {
      state.user = null;
      state.companies = [];
      state.selectedCompany = null;
      state.menu = [];
    },
  },
});

export const actions = appSlice.actions;

const persistedReducer = persistReducer({
  key: 'app',
  storage: agentcareStorage,
  whitelist: ['selectedCompany', 'locale', 'dark'],
}, appSlice.reducer);

export const store = configureStore({
  reducer: { app: persistedReducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);
