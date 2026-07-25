import { useState } from "react";

import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Card>
        <h1 className="text-3xl font-bold text-blue-700 mb-2">PramaanChain</h1>

        <p className="text-gray-500 mb-6">Government Issuer Portal</p>

        <Input
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button>Login</Button>
      </Card>
    </div>
  );
}

export default Login;
