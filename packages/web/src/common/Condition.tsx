type ConditionParams = {
    render: boolean;
    children: React.ReactElement;
}

export default function Condition({ render, children }: ConditionParams): JSX.Element {
    if (render) {
        return (<>{children}</>);
    } else {
        return (<></>);
    }
}
