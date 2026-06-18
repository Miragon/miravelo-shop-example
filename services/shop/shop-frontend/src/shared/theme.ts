import {createTheme} from "@mui/material/styles";

/**
 * Miravelo brand theme.
 *
 * The palette follows the miragon corporate design (see public/miragon.png):
 * a vivid royal blue as the primary colour and a bright green as the accent.
 */
export const theme = createTheme({
    palette: {
        primary: {
            main: "#3B5BF6",
        },
        secondary: {
            main: "#1FD16B",
        },
    },
    shape: {
        borderRadius: 10,
    },
    typography: {
        h6: {
            fontWeight: 700,
            letterSpacing: "0.02em",
        },
    },
});
