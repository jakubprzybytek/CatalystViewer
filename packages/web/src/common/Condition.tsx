type ConditionParams = {
    render: boolean;
    children: React.ReactElement | React.JSX.Element[];
}

export default function Condition({ render, children }: ConditionParams): JSX.Element {
    if (render) {
        return (<>{children}</>);
    } else {
        return (<></>);
    }
}
