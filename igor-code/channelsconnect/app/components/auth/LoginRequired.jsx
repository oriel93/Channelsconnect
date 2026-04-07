// Redirect to NewLoginRequired - using the new authentication flow
import NewLoginRequired from './NewLoginRequired';

export default function LoginRequired({ children }) {
  return <NewLoginRequired>{children}</NewLoginRequired>;
}

