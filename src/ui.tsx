import BN from "bn.js";


export function ui(o: BN) : JSX.Element{
  return <div>{o.toString(10)}</div> ;
}
