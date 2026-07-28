import { Toaster } from "react-hot-toast";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <Toaster
            position="top-right"
            reverseOrder={false}
            toastOptions={{
              duration: 3500,
              style: {
                border: "1px solid #292d35",
                borderRadius: "14px",
                background: "#181b21",
                color: "#f4f4f5",
                boxShadow: "0 18px 45px rgba(0, 0, 0, 0.32)",
              },
              success: {
                iconTheme: {
                  primary: "#34d399",
                  secondary: "#102c25",
                },
              },
              error: {
                iconTheme: {
                  primary: "#fb7185",
                  secondary: "#32151b",
                },
              },
            }}
          />
          <AppRoutes />
        </AuthProvider>
      </MotionConfig>
    </LazyMotion>
  );
}

export default App;
