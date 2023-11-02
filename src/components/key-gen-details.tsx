import { DmdComponent } from "./dmd-component";
import { Table } from "react-bootstrap";

function formatEth(input: string) {
  const number = Number.parseFloat(input);
  if (Number.isNaN(number)) {
    return 'NaN';
  }
  return number.toFixed(2);
}


export class ContractDetailsUI extends DmdComponent {


  public render(): JSX.Element { 

    const { context } = this.props.modelDataAdapter;

    return <div>
        <Table bordered hover>
            <tbody>
              <tr>
                <td>current epochs reward expections</td>
              </tr>
              <tr>
              <td>validators</td>
                <td>{context.pools.filter(x => x.isCurrentValidator).length}</td>
              </tr>
              <tr>
                <td>keys written:</td>
                <tr>{formatEth(context.deltaPot)}</tr>
              </tr>

            </tbody>
        </Table>
        </div>;
  }

}