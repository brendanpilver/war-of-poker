import { Fragment } from "react";
import { shortStackPlo } from "@/lib/short-stack-plo";

/** The book subtitle, never broken inside a hyphenated word ("Pot-" / "Limit"). */
export function BookSubtitle() {
  return (
    <>
      {shortStackPlo.subtitle.split(" ").map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {word.includes("-") ? (
            <span className="whitespace-nowrap">{word}</span>
          ) : (
            word
          )}
        </Fragment>
      ))}
    </>
  );
}
