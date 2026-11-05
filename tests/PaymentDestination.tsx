import { useLocation } from 'react-router'

export function PaymentDestination() {
  return <div data-testid="destination">{useLocation().pathname}</div>
}
