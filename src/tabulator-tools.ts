
  //custom max min filter function
  export function minMaxFilterFunction(headerValue: any, rowValue: any, rowData: any, filterParams: any){
    //headerValue - the value of the header filter element
    //rowValue - the value of the column in this row
    //rowData - the data for the row being filtered
    //filterParams - params object passed to the headerFilterFuncParams property
  
        if(rowValue){
            if(headerValue.start !== ""){
                if(headerValue.end !== ""){
                    return rowValue >= headerValue.start && rowValue <= headerValue.end;
                } else{
                    return rowValue >= headerValue.start;
                }
            } else{
                if(headerValue.end !== ""){
                    return rowValue <= headerValue.end;
                }
            }
        }
  
    return true; //must return a boolean, true if it passes the filter.
  }