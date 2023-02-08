import { BigNumber } from "ethers";

export function cast(o: any): any {
  if (isSolidityStructArray(o)) {
    return o.map((e: any) => cast(e));
  }

  if (!isSolidityStruct(o)) {
    return o;
  }

  return Object.keys(o).reduce((prevKeys: any, currentKey: string) => {
    if (Number.isInteger(+currentKey)) {
      return prevKeys;
    }

    return { ...prevKeys, [currentKey]: cast(o[currentKey]) };
  }, {});
}

function isSolidityStruct(o: any): boolean {
  return hasNonNumericProperty(o) && !(o instanceof BigNumber);
}

function isSolidityStructArray(o: any): boolean {
  return (
    Array.isArray(o) &&
    o.length > 0 &&
    !hasNonNumericProperty(o) &&
    isSolidityStruct(o[0])
  );
}

function hasNonNumericProperty(o: any): boolean {
  return Object.keys(o).some((key: string) => !Number.isInteger(+key));
}
