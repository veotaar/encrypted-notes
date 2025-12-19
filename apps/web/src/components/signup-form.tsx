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
import { Spinner } from "@web/components/ui/spinner";
import { signUp } from "@web/lib/auth-client";
import {
	deriveKeyFromPassword,
	generateMasterKey,
	generateSalt,
	wrapMasterKey,
} from "@web/lib/crypto";
import { useCrypto } from "@web/lib/crypto-context";
import { cn } from "@web/lib/utils";
import { z } from "zod";

const signupFormSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		email: z.email("Invalid email address"),
		password: z.string().min(8, "Password must be at least 8 characters long"),
		confirmPassword: z
			.string()
			.min(8, "Password must be at least 8 characters long"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		error: "Passwords do not match",
		path: ["confirmPassword"],
	});

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
	const { setMasterKey } = useCrypto();
	const navigate = useNavigate();

	const {
		mutate: signup,
		isPending,
		error: signupError,
		reset: resetMutation,
	} = useMutation({
		mutationFn: async (value: z.infer<typeof signupFormSchema>) => {
			const encryptionSalt = generateSalt();
			const masterKey = await generateMasterKey();

			const kek = await deriveKeyFromPassword(value.password, encryptionSalt);
			const wrappedMasterKey = await wrapMasterKey(masterKey, kek);

			const { data, error } = await signUp.email({
				name: value.name,
				email: value.email,
				password: value.password,
				wrappedMasterKey,
				encryptionSalt,
			});

			if (error) throw error;
			if (!data?.user) throw new Error("Signup failed");

			// Store the master key (already unwrapped since we just generated it)
			await setMasterKey(masterKey);

			return data;
		},
		onSuccess: async () => {
			await navigate({ to: "/" });
		},
	});

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		validators: {
			onChange: signupFormSchema,
			// onBlur: signupFormSchema,
			onSubmit: signupFormSchema,
		},
		onSubmit: async ({ value, formApi }) => {
			resetMutation();
			signup(value, {
				onError: () => {
					formApi.resetField("password");
					formApi.resetField("confirmPassword");
				},
			});
		},
	});

	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>Create an account</CardTitle>
				<CardDescription>
					Enter your information below to create your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				{signupError && (
					<Alert variant="destructive">
						<WarningIcon />
						<AlertTitle>{signupError.message || "Signup failed"}</AlertTitle>
						<AlertDescription>
							<p>Please verify your information and try again.</p>
						</AlertDescription>
					</Alert>
				)}
			</CardContent>

			<CardContent>
				<form
					id="sign-up-form"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field
							name="name"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Name</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="Your Name"
											autoComplete="off"
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>
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
						<form.Field
							name="confirmPassword"
							// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											Confirm Password
										</FieldLabel>
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
											Please confirm your password.
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
									form="sign-up-form"
									className={cn(
										"hover:cursor-pointer hover:bg-primary/80",
										isPending && "cursor-not-allowed",
									)}
									disabled={isPending}
								>
									{isPending ? (
										<Spinner className="size-4" />
									) : (
										"Create Account"
									)}
								</Button>
								<FieldDescription className="px-6 text-center">
									Already have an account? <Link to="/login">Log in</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
