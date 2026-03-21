import { createContext, useContext } from "react";

const ThemeContext = createContext({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
