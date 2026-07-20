import { useState } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { EyeIcon, EyeOffIcon } from "./icons.jsx";

export default function PasswordField({
  label = "Password",
  value,
  defaultValue,
  onChange,
  helperText,
  autoComplete = "current-password",
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const controlled = value !== undefined;

  return (
    <TextField
      label={label}
      type={visible ? "text" : "password"}
      fullWidth
      {...(controlled ? { value, onChange } : { defaultValue: defaultValue ?? "" })}
      helperText={helperText}
      autoComplete={autoComplete}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible((current) => !current)}
              onMouseDown={(event) => event.preventDefault()}
              edge="end"
              size="small"
            >
              {visible ? <EyeOffIcon fontSize="small" /> : <EyeIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      {...props}
    />
  );
}
