import Card, {CardContent, CardHeader, CardSubtitle, CardTitle} from "./Card.tsx";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {Blueprint} from "../pages/Blueprints.tsx";

type BlueprintCardProps = {
    blueprint: Blueprint;
    onClick: () => void;
}

export default function BlueprintCard({blueprint, onClick}: BlueprintCardProps) {
    return (
        <Card hover onClick={onClick}>
            <CardHeader icon={blueprint.tags["idp:blueprintIcon"] || "map"} iconColor="red" backgroundColor="amber"
                        badges={[
                            {text: blueprint.tags["idp:blueprintType"], variant: "info"},
                            {text: blueprint.tags["idp:blueprintLifecycle"], variant: "primary"},
                            {text: blueprint.tags["idp:blueprintVersion"], variant: "secondary"}
                        ]}>
                <CardTitle textSize={"text-3xl"}>{blueprint.displayName}</CardTitle>
                <CardSubtitle textSize={"text-lg"}>{blueprint.author}</CardSubtitle>
            </CardHeader>
            <CardContent>
                {blueprint.description ? (
                    <Markdown components={
                        {
                            p: ({...props}) => <p className="mb-4" {...props}/>,
                            li: ({...props}) => <li className="list-disc list-inside" {...props}/>,
                        }
                    } remarkPlugins={[remarkGfm]}>{blueprint.description}</Markdown>
                ) : (
                    'No description available'
                )}
            </CardContent>
        </Card>
    );
}
