import { WarningIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@web/components/ui/alert";
import { Button } from "@web/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@web/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@web/components/ui/field";
import { Input } from "@web/components/ui/input";
import { signIn } from "@web/lib/auth-client";
import { useCrypto } from "@web/lib/crypto-context";
import { cn } from "@web/lib/utils";
import { z } from "zod";
import { deriveKeyFromPassword, unwrapMasterKey } from "../lib/crypto";
import { Spinner } from "./ui/spinner";

const loginFormSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters long"),
});

// Type for the additional encryption fields that better-auth returns but doesn't infer
type UserWithEncryption = {
	wrappedMasterKey: string;
	encryptionSalt: string;
};

export function LoginForm({ ...props }: React.ComponentProps<typeof Card>) {
	const { setMasterKey } = useCrypto();
	const navigate = useNavigate();

	const {
		mutate: login,
		isPending,
		error: loginError,
		reset: resetMutation,
	} = useMutation({
		mutationFn: async (value: z.infer<typeof loginFormSchema>) => {
			const { data, error } = await signIn.email({
				email: value.email,
				password: value.password,
			});

			if (error) throw error;
			if (!data?.user) throw new Error("Login failed");

			// Cast to access encryption fields (better-auth returns them but doesn't infer types)
			const user = data.user as typeof data.user & UserWithEncryption;

			// Derive KEK from password and unwrap the master key
			const kek = await deriveKeyFromPassword(
				value.password,
				user.encryptionSalt,
			);
			const masterKey = await unwrapMasterKey(user.wrappedMasterKey, kek);
			await setMasterKey(masterKey);

			return data;
		},
		onSuccess: async () => {
			await navigate({ to: "/" });
		},
	});

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onChange: loginFormSchema,
			// onBlur: loginFormSchema,
			onSubmit: loginFormSchema,
		},
		onSubmit: async ({ value, formApi }) => {
			resetMutation();
			login(value, {
				onError: () => {
					formApi.resetField("password");
				},
			});
		},
	});

	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>Login to your account</CardTitle>
				<CardDescription>
					Enter your information below to login to your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				{loginError && (
					<Alert variant="destructive">
						<WarningIcon />
						<AlertTitle>{loginError.message || "Login failed"}</AlertTitle>
						<AlertDescription>
							<p>Please verify your login information and try again.</p>
						</AlertDescription>
					</Alert>
				)}
			</CardContent>

			<CardContent>
				<form
					id="login-form"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field
							name="email"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Email</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="m@example.com"
											required
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>
						<form.Field
							name="password"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Password</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											type="password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
										/>
										<FieldDescription>
											Must be at least 8 characters long.
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>

						<FieldGroup>
							<Field>
								<Button
									type="submit"
									form="login-form"
									className={cn(
										"hover:cursor-pointer hover:bg-primary/80",
										isPending && "cursor-not-allowed",
									)}
									disabled={isPending}
								>
									{isPending ? <Spinner className="size-4" /> : "Login"}
								</Button>
								<FieldDescription className="px-6 text-center">
									Don&apos;t have an account? <Link to="/signup">Sign up</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
